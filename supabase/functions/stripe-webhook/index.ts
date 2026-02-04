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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      if (session.payment_status !== 'paid') {
        return new Response("Sessão não paga.", { status: 200 });
      }

      const totalAmount = (session.amount_total || 0) / 100; 
      const metadata = session.metadata;
      
      const userId = metadata?.user_id;
      const shippingAddressId = metadata?.shipping_address_id;
      const shippingCost = parseFloat(metadata?.shipping_cost || '0');
      const orderItemsJson = metadata?.orderItems;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

      if (!userId || !shippingAddressId || !paymentIntentId || !orderItemsJson) {
        return new Response("Metadados ausentes.", { status: 400 });
      }

      const orderItemsPayload = JSON.parse(orderItemsJson);

      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (existingOrder) {
        return new Response("Pedido já processado.", { status: 200 });
      }

      // 1. Criar o Pedido
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'processing',
          shipping_address_id: shippingAddressId,
          payment_method: metadata.payment_method,
          shipping_cost: shippingCost,
          stripe_payment_intent_id: paymentIntentId,
          shipping_service_id: metadata.shipping_rate_id,
          shipping_service_name: metadata.shipping_rate_name,
          delivery_time: metadata.delivery_time,
          shipping_street: metadata.shipping_street,
          shipping_number: metadata.shipping_number,
          shipping_complement: metadata.shipping_complement,
          shipping_neighborhood: metadata.shipping_neighborhood,
          shipping_city: metadata.shipping_city,
          shipping_state: metadata.shipping_state,
          shipping_zip_code: metadata.shipping_zip_code,
        })
        .select('id')
        .single();
      
      if (orderError) throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      const orderId = orderData.id;

      // 2. Criar os Itens do Pedido
      const finalOrderItemsPayload = orderItemsPayload.map((item: any) => ({
        ...item,
        order_id: orderId,
      }));

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(finalOrderItemsPayload);
      if (itemsError) {
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        throw new Error(`Erro ao salvar itens do pedido: ${itemsError.message}`);
      }

      // 3. Baixa de Estoque Cirúrgica (POR TAMANHO)
      const stockUpdates = orderItemsPayload.map((item: any) => 
        supabaseAdmin.rpc('decrement_product_size_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_size: item.selected_size // Passando o tamanho exato
        })
      );
      
      await Promise.all(stockUpdates);

      // 4. Limpar os itens do carrinho que foram comprados
      const cartItemDeletions = orderItemsPayload.map((item: any) => {
        const colorCode = item.selected_color?.code || null;
        const size = item.selected_size || null;
        return supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', item.product_id)
          .eq('selected_size', size)
          .eq('selected_color', colorCode);
      });
      
      await Promise.all(cartItemDeletions);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Erro no webhook do Stripe:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});