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

      // Encontra o pedido correspondente
      const { data: order, error: findError } = await supabaseAdmin
        .from('orders')
        .select('id, status, order_items(product_id, quantity)')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (findError) {
        console.warn(`Webhook: Pedido com payment_intent_id ${paymentIntentId} não encontrado.`);
        return new Response("Pedido não encontrado.", { status: 404 });
      }

      // Atualiza o status do pedido para 'processing' se ainda estiver 'pending'
      if (order.status === 'pending') {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', order.id);

        if (updateError) throw new Error(`Erro ao atualizar pedido ${order.id}: ${updateError.message}`);

        // Lógica para dar baixa no estoque
        const stockUpdates = order.order_items.map(item => 
          supabaseAdmin.rpc('update_product_stock', {
            p_product_id: item.product_id,
            p_new_stock: -item.quantity // A função precisa ser ajustada para aceitar valores negativos para decremento
          })
        );
        await Promise.all(stockUpdates);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Erro no webhook do Stripe:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});