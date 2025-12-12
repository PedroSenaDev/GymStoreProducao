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
      customerEmail, birthdayDiscount
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
    let subtotal = 0;
    
    const lineItems = items.map((item: any) => {
      const price = productPriceMap.get(item.id) || 0;
      subtotal += (price * item.quantity);

      // Stripe espera amount em centavos para price data
      const unitAmount = Math.round(price * 100);

      return {
        price_data: {
          currency: 'brl',
          product_data: {
            name: item.name,
            images: item.image_urls ? [item.image_urls[0]] : [],
            description: `Tamanho: ${item.selectedSize || 'N/A'}, Cor: ${item.selectedColor?.name || 'N/A'}`,
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    // 2. Aplicar Desconto de Aniversário (como um item de linha negativo)
    const discountPercentage = Number(birthdayDiscount || 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    
    if (discountAmount > 0) {
        lineItems.push({
            price_data: {
                currency: 'brl',
                product_data: {
                    name: `Desconto de Aniversário (${discountPercentage}%)`,
                },
                unit_amount: -Math.round(discountAmount * 100), // Valor negativo
            },
            quantity: 1,
        });
    }

    // 3. Adicionar Custo de Envio (como um item de linha)
    if (shippingCost > 0) {
        lineItems.push({
            price_data: {
                currency: 'brl',
                product_data: {
                    name: `Frete: ${shippingRateName}`,
                    description: `Prazo: ${deliveryTime} dias`,
                },
                unit_amount: Math.round(shippingCost * 100),
            },
            quantity: 1,
        });
    }
    
    // 4. Criar a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      customer_email: customerEmail,
      // Usamos o URL do Vercel para o redirecionamento
      success_url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://gymstoremoc.vercel.app'}/payment-status?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://gymstoremoc.vercel.app'}/checkout`,
      metadata: {
        user_id: userId,
        shipping_address_id: shippingAddressId,
        shipping_cost: shippingCost.toFixed(2),
        shipping_rate_id: shippingRateId.toString(),
        shipping_rate_name: shippingRateName,
        delivery_time: deliveryTime?.toString() || 'N/A',
        birthday_discount_percentage: discountPercentage.toString(),
        subtotal_before_discount: subtotal.toFixed(2),
      },
    });

    // 5. Retornar o URL de redirecionamento
    return new Response(JSON.stringify({ sessionUrl: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro ao criar Checkout Session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})