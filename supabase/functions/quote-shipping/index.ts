import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Valores de frete fixo temporário
const FIXED_SHIPPING_COST = 15.00;
const FREE_SHIPPING_THRESHOLD = 200.00;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { destinationCep, items, storeCep } = await req.json();

    if (!destinationCep || !items || !storeCep) {
      return new Response(JSON.stringify({ error: "Dados de cotação incompletos (CEP de destino, itens ou CEP de origem)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar preços dos produtos para calcular o subtotal
    const productIds = items.map((item: any) => item.id);
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price')
      .in('id', productIds);

    if (productsError) throw new Error(`Erro ao buscar preços dos produtos: ${productsError.message}`);

    const productPriceMap = new Map(productsData.map(p => [p.id, p.price]));
    
    const subtotal = items.reduce((acc: number, item: any) => {
      const price = productPriceMap.get(item.id) || 0;
      return acc + (price * item.quantity);
    }, 0);

    // 2. Lógica de Frete Fixo/Grátis
    let shippingPrice = FIXED_SHIPPING_COST;
    let shippingName = "Entrega Padrão";
    let deliveryTime = 5; // 5 dias úteis

    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingPrice = 0.00;
        shippingName = "Frete Grátis (Promoção)";
        deliveryTime = 7;
    }

    const fixedShippingOption = [{
        id: 'fixed_rate_1',
        name: shippingName,
        price: shippingPrice,
        delivery_time: deliveryTime,
    }];

    return new Response(JSON.stringify(fixedShippingOption), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})