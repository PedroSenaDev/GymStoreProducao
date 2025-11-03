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
    const { items, shippingCost } = await req.json();

    if (!items || items.length === 0) {
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

    // 2. Criar o PaymentIntent no Stripe
    // NOTA: O metadata deve conter todos os dados necessários para recriar o pedido no webhook.
    const metadata = {
        user_id: items[0].user_id, // Adicionando user_id (assumindo que todos os itens são do mesmo usuário)
        shipping_address_id: items[0].shipping_address_id, // Adicionando address_id
        shipping_cost: shippingCost.toString(),
        shipping_distance: items[0].shipping_distance.toString(),
        shipping_zone_id: items[0].shipping_zone_id,
        items_json: JSON.stringify(items.map((item: any) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: productPriceMap.get(item.id) || item.price,
            selected_size: item.selectedSize,
            selected_color: item.selectedColor,
        }))),
    };

    // O Stripe tem um limite de 500 caracteres para metadata. Vamos garantir que o JSON dos itens caiba.
    // Se o JSON for muito grande, teremos que buscar os itens do carrinho no webhook, mas por enquanto, vamos tentar passar o máximo de dados.
    
    // Para simplificar e evitar o limite de 500 caracteres do metadata do Stripe,
    // vamos passar apenas os IDs e buscar os detalhes no webhook.
    // No entanto, como o carrinho é limpo após o sucesso, precisamos de uma forma de persistir os dados.
    // A melhor abordagem é passar os dados essenciais e recriar o pedido no webhook.

    // Vamos simplificar o metadata para o essencial e confiar que o webhook pode recriar o pedido.
    // Para evitar o erro de "shippingAddressId is not defined" no webhook, vamos passar os dados essenciais.
    
    const essentialMetadata = {
        user_id: userId,
        shipping_address_id: shippingAddressId,
        shipping_cost: shippingCost.toString(),
        shipping_distance: shippingDistance.toString(),
        shipping_zone_id: shippingZoneId,
        // Passamos o total para o Stripe, mas o webhook deve recalcular.
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // em centavos
      currency: 'brl',
      metadata: essentialMetadata,
    });

    // 3. Retornar o client_secret para o frontend
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