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

const MELHOR_ENVIO_ACCESS_TOKEN = Deno.env.get("MELHOR_ENVIO_ACCESS_TOKEN")
const MELHOR_ENVIO_CLIENT_ID = Deno.env.get("MELHOR_ENVIO_CLIENT_ID")
const MELHOR_ENVIO_SECRET = Deno.env.get("MELHOR_ENVIO_SECRET")

// URL da API do Melhor Envio (usando sandbox para desenvolvimento, mude para produção se necessário)
const ME_API_URL = 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!MELHOR_ENVIO_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "Chave de acesso do Melhor Envio não configurada. Por favor, configure MELHOR_ENVIO_ACCESS_TOKEN nos segredos do Supabase." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { destinationCep, items, storeCep } = await req.json();

    if (!destinationCep || !items || !storeCep) {
      return new Response(JSON.stringify({ error: "Dados de cotação incompletos (CEP de destino, itens ou CEP de origem)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar detalhes completos dos produtos (peso/dimensões)
    const productIds = items.map((item: any) => item.id);
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, weight_kg, length_cm, height_cm, width_cm')
      .in('id', productIds);

    if (productsError) throw new Error(`Erro ao buscar dimensões dos produtos: ${productsError.message}`);

    const productDetailsMap = new Map(productsData.map(p => [p.id, p]));

    // 2. Montar o payload para o Melhor Envio
    const meItems = items.map((item: any) => {
      const details = productDetailsMap.get(item.id);
      if (!details) throw new Error(`Detalhes de dimensão ausentes para o produto ID: ${item.id}`);

      return {
        id: item.id,
        quantity: item.quantity,
        weight: details.weight_kg,
        width: details.width_cm,
        height: details.height_cm,
        length: details.length_cm,
      };
    });

    const mePayload = {
      from: { postal_code: storeCep.replace(/\D/g, '') },
      to: { postal_code: destinationCep.replace(/\D/g, '') },
      products: meItems,
      // Adiciona o tipo de serviço que você deseja cotar (ex: Correios, Jadlog)
      // Se omitido, cota todos os disponíveis.
      // services: ['1', '2', '3', '17', '18'], 
    };

    // 3. Chamar a API do Melhor Envio
    const response = await fetch(ME_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MELHOR_ENVIO_ACCESS_TOKEN}`,
        'User-Agent': 'GYMSTORE (gymstoreemoc@gmail.com)', // Substitua pelo seu e-mail
      },
      body: JSON.stringify(mePayload),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error("Melhor Envio API Error:", responseData);
      // Tenta extrair a mensagem de erro mais útil
      const errorMessage = responseData.error?.message || responseData.message || "Falha ao cotar o frete com o Melhor Envio.";
      throw new Error(errorMessage);
    }

    // 4. Filtrar e formatar as opções de frete
    const validShippingOptions = responseData
      .filter((option: any) => option.error === undefined && option.price > 0)
      .map((option: any) => ({
        id: option.id.toString(), // ID do serviço (ex: 1 para PAC)
        name: option.name, // Nome da transportadora/serviço
        price: parseFloat(option.price),
        delivery_time: option.delivery_time, // Prazo em dias úteis
      }));

    if (validShippingOptions.length === 0) {
        throw new Response(JSON.stringify({ error: "Nenhuma opção de frete válida encontrada para este CEP e produtos." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(validShippingOptions), {
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