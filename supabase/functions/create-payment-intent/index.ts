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
    const { 
      items, shippingCost, userId, shippingAddressId, shippingRateId, shippingRateName, deliveryTime,
      customerName, customerEmail, customerPhone, birthdayDiscount // Novo parâmetro
    } = await req.json();

    if (!items || items.length === 0 || !userId || !shippingAddressId || !shippingRateId || !shippingRateName || !customerEmail) {
      throw new Error("Informações essenciais do pedido ou cliente incompletas.");
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

    // 2. Aplicar Desconto de Aniversário
    const discountPercentage = Number(birthdayDiscount || 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;

    // 3. Calcular o Total Final
    const totalAmount = subtotalAfterDiscount + shippingCost;

    if (totalAmount <= 0) {
        throw new Error("O valor total do pedido deve ser maior que zero.");
    }

    // 4. Encontrar ou criar o cliente na Stripe
    let customerId;
    const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
      customerId = newCustomer.id;
    }

    // 5. Criar o PaymentIntent no Stripe associado ao cliente
    const essentialMetadata = {
        user_id: userId,
        shipping_address_id: shippingAddressId,
        shipping_cost: shippingCost.toString(),
        shipping_rate_id: shippingRateId.toString(),
        shipping_rate_name: shippingRateName,
        delivery_time: deliveryTime?.toString() || 'N/A',
        // Adicionando metadados de desconto para rastreamento
        birthday_discount_percentage: discountPercentage.toString(),
        subtotal_before_discount: subtotal.toFixed(2),
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // em centavos
      currency: 'brl',
      customer: customerId, // Associando o cliente
      receipt_email: customerEmail, // Garante que o recibo seja enviado
      metadata: essentialMetadata,
    });

    // 6. Retornar o client_secret para o frontend
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