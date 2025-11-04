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
    const { items, shippingCost, userId, shippingAddressId, shippingDistance, shippingZoneId, customerDetails } = await req.json();

    if (!items || items.length === 0 || !userId || !shippingAddressId || !customerDetails) {
      throw new Error("Informações essenciais do pedido incompletas.");
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

    // 2. Gerenciar o Cliente Stripe
    let stripeCustomerId: string;

    // Tenta encontrar um cliente Stripe existente usando o userId do Supabase
    const existingCustomers = await stripe.customers.list({
        metadata: { supabase_user_id: userId },
        limit: 1,
    });

    // Garante que os detalhes do cliente são strings, usando fallback para evitar erros de tipo
    const name = customerDetails.name || 'N/A';
    const email = customerDetails.email || 'N/A';
    const phone = customerDetails.phone || '';
    const cpf = (customerDetails.cpf || '').replace(/\D/g, ''); // Limpa o CPF

    if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
    } else {
        // Cria um novo cliente Stripe
        const newCustomer = await stripe.customers.create({
            email: email,
            name: name,
            // Não passamos o 'phone' aqui para evitar erros de validação de formato E.164
            metadata: {
                supabase_user_id: userId,
                cpf: cpf,
                phone: phone, // Armazenamos o telefone nos metadados
            },
        });
        stripeCustomerId = newCustomer.id;
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
      customer: stripeCustomerId, // Vincula o PI ao cliente Stripe
      metadata: essentialMetadata,
    });

    // 4. Retornar o client_secret para o frontend
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro ao criar Payment Intent:", error);
    // Retorna a mensagem de erro para o frontend para melhor depuração
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})