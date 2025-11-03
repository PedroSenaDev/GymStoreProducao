import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  
  try {
    const event = await stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const metadata = paymentIntent.metadata;
      const totalAmount = paymentIntent.amount / 100; // Convertendo de centavos para R$

      const userId = metadata.user_id;
      const shippingAddressId = metadata.shipping_address_id;
      const shippingCost = parseFloat(metadata.shipping_cost || '0');
      const shippingDistance = parseFloat(metadata.shipping_distance || '0');
      const shippingZoneId = metadata.shipping_zone_id;

      if (!userId || !shippingAddressId) {
        console.error("Webhook: Metadados essenciais ausentes (user_id ou shipping_address_id).");
        return new Response("Metadados ausentes.", { status: 400 });
      }

      // 1. Buscar os itens do carrinho do usuário (que foram selecionados no checkout)
      const { data: cartItems, error: cartError } = await supabaseAdmin
        .from('cart_items')
        .select('id, product_id, quantity, selected_size, selected_color, products(price)')
        .eq('user_id', userId);

      if (cartError) throw new Error(`Erro ao buscar itens do carrinho: ${cartError.message}`);
      if (!cartItems || cartItems.length === 0) {
        console.warn(`Webhook: Carrinho vazio para o usuário ${userId}.`);
        return new Response("Carrinho vazio.", { status: 200 });
      }

      // 2. Criar o pedido principal
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'processing', // Já está pago
          shipping_address_id: shippingAddressId,
          payment_method: 'credit_card',
          shipping_cost: shippingCost,
          shipping_distance: shippingDistance,
          shipping_zone_id: shippingZoneId,
          stripe_payment_intent_id: paymentIntentId,
        })
        .select('id')
        .single();
      
      if (orderError) throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      const orderId = orderData.id;

      // 3. Salvar os itens do pedido e dar baixa no estoque
      const orderItemsPayload = cartItems.map((item: any) => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products.price, // Usar o preço do DB
        selected_size: item.selected_size,
        selected_color: item.selected_color,
      }));

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload);
      if (itemsError) {
        // Se falhar ao salvar os itens, deleta o pedido principal
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        throw new Error(`Erro ao salvar itens do pedido: ${itemsError.message}`);
      }

      // 4. Dar baixa no estoque
      const stockUpdates = cartItems.map(item => 
        supabaseAdmin.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        })
      );
      
      // Executa todas as atualizações de estoque
      await Promise.all(stockUpdates);

      // 5. Limpar o carrinho do usuário (todos os itens, pois o checkout só permite itens selecionados)
      const { error: cartClearError } = await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', userId);
      
      if (cartClearError) {
          console.error(`Falha ao limpar o carrinho do usuário ${userId}:`, cartClearError);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Erro no webhook do Stripe:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});