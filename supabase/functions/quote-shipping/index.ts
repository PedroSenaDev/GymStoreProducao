import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY")
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const SENDER_ZIP_CODE = "39400-001"; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not found.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { cartItems, zipCode } = await req.json()
    const cleanedZipCode = zipCode.replace(/\D/g, '');

    if (!cartItems || cartItems.length === 0 || !cleanedZipCode || cleanedZipCode.length !== 8) {
      throw new Error("Dados inválidos para cotação.");
    }

    const shippingOptions = [];

    // --- 1. Calcular o pacote consolidado e subtotal ---
    let totalWeight = 0;
    let totalVolume = 0;
    let subtotal = 0;

    cartItems.forEach((item: any) => {
      const quantity = item.quantity || 1;
      const itemVolume = (item.length_cm || 1) * (item.width_cm || 1) * (item.height_cm || 1);
      totalVolume += itemVolume * quantity;
      totalWeight += (item.weight_kg || 0.1) * quantity;
      subtotal += item.price * quantity;
    });

    // Calcula a dimensão de um cubo com o volume total (raiz cúbica)
    const cubicSide = Math.cbrt(totalVolume);

    // Garante que as dimensões atendam aos mínimos dos Correios
    const finalPackage = {
      weight: totalWeight,
      width: Math.max(cubicSide, 11),  // Largura mínima
      height: Math.max(cubicSide, 2),   // Altura mínima
      length: Math.max(cubicSide, 16), // Comprimento mínimo
    };


    // --- 2. Determinar Localização e Aplicar Lógica de Frete ---
    const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanedZipCode}/json/`);
    if (!cepResponse.ok) throw new Error("Falha ao consultar o CEP.");
    const cepData = await cepResponse.json();
    if (cepData.erro) throw new Error("CEP não encontrado.");

    const isLocalDelivery = cepData.localidade === 'Montes Claros' && cepData.uf === 'MG';

    if (isLocalDelivery) {
      // --- Lógica para Frete Fixo (Local) ---
      const { data: fixedRates, error: fixedRatesError } = await supabase
        .from('fixed_shipping_rates')
        .select('*')
        .eq('is_active', true)
        .lte('min_order_value', subtotal);
      
      if (fixedRatesError) console.error("Error fetching fixed rates:", fixedRatesError);

      if (fixedRates) {
        fixedRates.forEach((rate: any) => {
          shippingOptions.push({
            id: rate.id,
            name: rate.label,
            price: rate.price,
            delivery_time: "N/A",
            type: 'fixed',
            company: { name: "Entrega Local", picture: null }
          });
        });
      }
    } else {
      // --- Lógica para Melhor Envio (Nacional) ---
      if (MELHOR_ENVIO_API_KEY) {
        const requestBody = {
          from: { postal_code: SENDER_ZIP_CODE },
          to: { postal_code: cleanedZipCode },
          package: finalPackage,
          services: "1,2,3" // 1: PAC, 2: SEDEX, 3: Jadlog .Package
        };

        console.log("Enviando para Melhor Envio:", JSON.stringify(requestBody, null, 2));

        const meResponse = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
            'User-Agent': 'GYMSTORE (contato@gymstore.com)'
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await meResponse.text();
        console.log("Resposta da API Melhor Envio:", responseText);

        if (meResponse.ok) {
          const meRates = JSON.parse(responseText);
          meRates.forEach((rate: any) => {
            if (!rate.error && rate.company) {
              shippingOptions.push({
                id: rate.id,
                name: rate.name,
                price: parseFloat(rate.price),
                delivery_time: rate.delivery_time,
                type: 'gateway',
                company: {
                  name: rate.company.name,
                  picture: rate.company.picture
                }
              });
            }
          });
        } else {
          console.error("Erro na API Melhor Envio. Status:", meResponse.status);
        }
      }
    }

    return new Response(JSON.stringify(shippingOptions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função quote-shipping:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})