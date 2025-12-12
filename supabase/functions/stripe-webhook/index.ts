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
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );

    // O evento principal para Checkout Sessions é 'checkout.session.completed'
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Verifica se o pagamento foi bem-sucedido
      if (session.payment_status !== 'paid') {
        console.log(`Checkout Session ${session.id} não paga. Status: ${session.payment_status}. Ignorando.`);
        return new Response("Sessão não paga.", { status: 200 });
      }

      // O total é o amount_total da sessão (em centavos)
      const totalAmount = (session.amount_total || 0) / 100; 
      const metadata = session.metadata;
      
      // Metadados essenciais
      const userId = metadata?.user_id;
      const shippingAddressId = metadata?.shipping_address_id;
      const shippingCost = parseFloat(metadata?.shipping_cost || '0');
      const shippingRateId = metadata?.shipping_rate_id;
      const shippingRateName = metadata?.shipping_rate_name;
      const deliveryTime = metadata?.delivery_time;
      
      // O ID do Payment Intent está aninhado na sessão
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

      if (!userId || !shippingAddressId || !shippingRateId || !shippingRateName || !paymentIntentId) {
        console.error("Webhook: Metadados essenciais ausentes na sessão de checkout.", metadata);
        return new Response("Metadados ausentes.", { status: 400 });
      }

      // Buscar o endereço completo para fazer o snapshot
      const { data: address, error: addressError } = await supabaseAdmin
        .from('addresses')
        .select('*')
        .eq('id', shippingAddressId)
        .single();
      
      if (addressError) throw new Error(`Endereço de entrega não encontrado: ${addressError.message}`);

      // Buscar os itens do carrinho (deve conter apenas os itens selecionados)
      const { data: cartItems, error: cartError } = await supabaseAdmin
        .from('cart_items')
        .select('id, product_id, quantity, selected_size, selected_color, products(price, colors)')
        .eq('user_id', userId);

      if (cartError) throw new Error(`Erro ao buscar itens do carrinho: ${cartError.message}`);
      
      // Verificar se o pedido já existe (proteção contra reenvio de webhook)
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (existingOrder) {
        console.log(`Pedido já processado para Payment Intent ${paymentIntentId}. Ignorando.`);
        return new Response("Pedido já processado.", { status: 200 });
      }
      
      if (!cartItems || cartItems.length === 0) {
        console.error(`ERRO: Checkout Session concluída, mas carrinho do usuário ${userId} está vazio. Não é possível criar order_items.`);
        // Retornamos 200 para a Stripe, mas logamos o erro crítico.
        return new Response("Carrinho vazio, mas pagamento recebido. Necessita revisão manual.", { status: 200 });
      }

      // 1. Criar o Pedido
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'processing',
          shipping_address_id: shippingAddressId,
          payment_method: 'credit_card',
          shipping_cost: shippingCost,
          stripe_payment_intent_id: paymentIntentId,
          shipping_service_id: shippingRateId,
          shipping_service_name: shippingRateName,
          delivery_time: deliveryTime,
          // Snapshot do endereço
          shipping_street: address.street,
          shipping_number: address.number,
          shipping_complement: address.complement,
          shipping_neighborhood: address.neighborhood,
          shipping_city: address.city,
          shipping_state: address.state,
          shipping_zip_code: address.zip_code,
        })
        .select('id')
        .single();
      
      if (orderError) {
        console.error(`ERRO CRÍTICO AO CRIAR PEDIDO (Stripe Webhook): ${orderError.message}`, { userId, paymentIntentId });
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }
      const orderId = orderData.id;

      // 2. Criar os Itens do Pedido
      const orderItemsPayload = cartItems.map((item: any) => {
        const productColors = item.products?.colors || [];
        const selectedColorObject = productColors.find((c: any) => c.code === item.selected_color);

        return {
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.products.price, // Usamos o preço do produto no DB para o item
          selected_size: item.selected_size,
          selected_color: selectedColorObject,
        };
      });

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload);
      if (itemsError) {
        // Se falhar, tentamos reverter o pedido
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        console.error(`ERRO CRÍTICO AO SALVAR ITENS (Stripe Webhook): ${itemsError.message}`, { orderId });
        throw new Error(`Erro ao salvar itens do pedido: ${itemsError.message}`);
      }

      // 3. Decrementar Estoque
      const stockUpdates = cartItems.map(item => 
        supabaseAdmin.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        })
      );
      
      await Promise.all(stockUpdates);

      // 4. Limpar o Carrinho
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