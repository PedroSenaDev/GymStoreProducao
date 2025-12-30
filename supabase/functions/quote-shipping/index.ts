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
    let subtotal = 0;
    let totalHeight = 0;
    let maxLength = 0;
    let maxWidth = 0;

    cartItems.forEach((item: any) => {
      const quantity = item.quantity || 1;
      totalWeight += (item.weight_kg || 0.1) * quantity;
      subtotal += item.price * quantity;
      
      totalHeight += (item.height_cm || 1) * quantity;
      maxLength = Math.max(maxLength, item.length_cm || 1);
      maxWidth = Math.max(maxWidth, item.width_cm || 1);
    });

    const finalPackage = {
      weight: totalWeight,
      width: Math.max(maxWidth, 11),
      height: Math.max(totalHeight, 2),
      length: Math.max(maxLength, 16),
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
            name: '', // Removemos o nome secundário para evitar repetição
            price: rate.price,
            delivery_time: `${rate.delivery_time_days} dia(s)`,
            type: 'fixed',
            icon_type: rate.icon_type,
            company: { 
              name: rate.label, // O título principal passa a ser o label do painel admin
              picture: null 
            }
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
          services: "1,2,3" 
        };

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

        const meRates = await meResponse.json();

        if (meResponse.ok) {
          const apiErrors: string[] = [];
          meRates.forEach((rate: any) => {
            if (rate.error) {
              apiErrors.push(`${rate.company.name}: ${rate.error}`);
            } else if (rate.company) {
              const originalDeliveryTime = parseInt(rate.delivery_time, 10);
              const finalDeliveryTime = !isNaN(originalDeliveryTime) ? originalDeliveryTime + 2 : rate.delivery_time;

              shippingOptions.push({
                id: rate.id,
                name: rate.name,
                price: parseFloat(rate.price),
                delivery_time: finalDeliveryTime,
                type: 'gateway',
                icon_type: 'truck',
                company: {
                  name: rate.company.name,
                  picture: rate.company.picture
                }
              });
            }
          });

          if (shippingOptions.length === 0 && apiErrors.length > 0) {
            throw new Error(`Erros da transportadora: ${apiErrors.join('; ')}`);
          }

        } else {
          throw new Error(`Erro na API Melhor Envio: ${JSON.stringify(meRates.errors || meRates)}`);
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