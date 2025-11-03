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
    const { items, shippingCost, userId, shippingAddressId, shippingDistance, shippingZoneId, customerData } = await req.json();

    if (!items || items.length === 0 || !userId || !shippingAddressId || !customerData || !customerData.cpf) {
      throw new Error("Informações essenciais do pedido ou do cliente incompletas.");
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

    // 2. Criar ou buscar o Customer no Stripe
    // Usamos o userId do Supabase como external_id para evitar duplicidade
    let customer;
    const searchCustomers = await stripe.customers.list({
        email: customerData.email,
        limit: 1,
    });

    if (searchCustomers.data.length > 0) {
        customer = searchCustomers.data[0];
    } else {
        customer = await stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            metadata: {
                supabase_user_id: userId,
            },
        });
    }

    // 3. Criar o PaymentIntent no Stripe
    const essentialMetadata = {
        user_id: userId,
        shipping_address_id: shippingAddressId,
        shipping_cost: shippingCost.toString(),
        shipping_distance: shippingDistance.toString(),
        shipping_zone_id: shippingZoneId,
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // em centavos
      currency: 'brl',
      customer: customer.id,
      metadata: essentialMetadata,
      payment_method_options: {
        card: {
          // Configura o Stripe para solicitar o CPF/CNPJ (tax_id)
          setup_future_usage: 'off_session',
          billing_details: {
            address: {
              country: 'BR',
            },
            tax_id: {
              type: 'br_cpf',
              value: customerData.cpf.replace(/\D/g, ''),
            },
          },
        },
      },
    });

    // 4. Retornar o client_secret para o frontend
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