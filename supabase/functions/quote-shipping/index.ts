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
      .select('id, name, weight_kg, length_cm, height_cm, width_cm') // Adicionando 'name' para melhor erro
      .in('id', productIds);

    if (productsError) throw new Error(`Erro ao buscar dimensões dos produtos: ${productsError.message}`);

    const productDetailsMap = new Map(productsData.map(p => [p.id, p]));

    // 2. Montar o payload para o Melhor Envio
    const meItems = items.map((item: any) => {
      const details = productDetailsMap.get(item.id);
      
      if (!details) {
        throw new Error(`Detalhes de dimensão ausentes para o produto ID: ${item.id}. Produto não encontrado no DB.`);
      }
      
      // Garantir que os valores são números e positivos
      const weight = details.weight_kg ? parseFloat(details.weight_kg.toString()) : 0;
      const length = details.length_cm ? parseFloat(details.length_cm.toString()) : 0;
      const height = details.height_cm ? parseFloat(details.height_cm.toString()) : 0;
      const width = details.width_cm ? parseFloat(details.width_cm.toString()) : 0;

      if (weight <= 0 || length <= 0 || height <= 0 || width <= 0) {
          throw new Error(`Produto "${details.name}" possui dimensões ou peso inválidos (devem ser > 0). Por favor, edite o produto no painel admin.`);
      }

      return {
        id: item.id,
        quantity: item.quantity,
        weight: weight,
        width: width,
        height: height,
        length: length,
      };
    });

    const mePayload = {
      from: { postal_code: storeCep.replace(/\D/g, '') },
      to: { postal_code: destinationCep.replace(/\D/g, '') },
      products: meItems,
    };

    // 3. Chamar a API do Melhor Envio
    const response = await fetch(ME_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MELHOR_ENVIO_ACCESS_TOKEN}`,
        'User-Agent': 'GYMSTORE (gymstoreemoc@gmail.com)',
      },
      body: JSON.stringify(mePayload),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error("Melhor Envio API Error:", responseData);
      const errorMessage = responseData.error?.message || responseData.message || "Falha ao cotar o frete com o Melhor Envio.";
      throw new Error(errorMessage);
    }

    // 4. Filtrar e formatar as opções de frete
    const validShippingOptions = responseData
      .filter((option: any) => option.error === undefined && option.price > 0)
      .map((option: any) => ({
        id: option.id.toString(),
        name: option.name,
        price: parseFloat(option.price),
        delivery_time: option.delivery_time,
      }));

    if (validShippingOptions.length === 0) {
        // Se houver erros específicos da transportadora, exibe o primeiro erro
        const firstError = responseData.find((item: any) => item.error)?.error;
        throw new Error(firstError || "Nenhuma opção de frete válida encontrada para este CEP e produtos.");
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