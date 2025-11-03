import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { items, shippingAddressId, userId, shippingCost, shippingDistance, shippingZoneId } = await req.json();

    if (!items || items.length === 0 || !shippingAddressId || !userId) {
      throw new Error("Informações do pedido incompletas.");
    }

    // 1. Recalcular o subtotal dos produtos por segurança
    const productIds = items.map((item: any) => item.id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price')
      .in('id', productIds);
    if (productsError) throw productsError;

    const productPriceMap = new Map(products.map(p => [p.id, p.price]));
    const subtotal = items.reduce((acc: number, item: any) => {
      const price = productPriceMap.get(item.id) || 0;
      return acc + (price * item.quantity);
    }, 0);

    const totalAmount = subtotal + shippingCost;

    // 2. Criar um pedido 'pending' no banco de dados
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address_id: shippingAddressId,
        payment_method: 'credit_card',
        shipping_cost: shippingCost,
        shipping_distance: shippingDistance,
        shipping_zone_id: shippingZoneId,
      })
      .select('id')
      .single();
    if (orderError) throw orderError;
    const orderId = orderData.id;

    // 3. Criar o PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // em centavos
      currency: 'brl',
      metadata: {
        order_id: orderId,
      },
    });

    // 4. Atualizar nosso pedido com o ID do PaymentIntent
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', orderId);
    if (updateError) throw updateError;

    // 5. Retornar o client_secret para o frontend
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro ao criar Payment Intent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})