import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY")
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Função auxiliar para fazer requisições autenticadas à API da Melhor Envio
async function fetchMelhorEnvio(endpoint: string, options: RequestInit) {
    const url = `https://sandbox.melhorenvio.com.br${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
            'User-Agent': 'GYMSTORE (contato@gymstore.com)',
            ...options.headers,
        },
    });

    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(`Erro na API Melhor Envio (${response.status}): ${responseText}`);
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`A API Melhor Envio retornou uma resposta inválida (não-JSON). Resposta: ${responseText}`);
    }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!MELHOR_ENVIO_API_KEY) {
      throw new Error("API Key do Melhor Envio não configurada.");
    }

    const { orderId } = await req.json();
    if (!orderId) {
      throw new Error("ID do pedido é obrigatório.");
    }

    // 1. Buscar dados completos do pedido no Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`*, profiles (*), order_items (*, products (*))`)
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Pedido não encontrado: ${orderError.message}`);
    if (order.status !== 'processing') throw new Error("A etiqueta só pode ser gerada para pedidos com status 'Processando'.");
    if (!order.profiles) throw new Error("Dados do perfil do cliente não encontrados.");

    // 2. Preparar dados do pacote e destinatário
    let totalWeight = 0;
    let totalValue = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    order.order_items.forEach((item: any) => {
      const quantity = item.quantity || 1;
      totalWeight += (item.products.weight_kg || 0.1) * quantity;
      totalValue += item.price * quantity;
      maxLength = Math.max(maxLength, item.products.length_cm || 1);
      maxWidth = Math.max(maxWidth, item.products.width_cm || 1);
      totalHeight += (item.products.height_cm || 1) * quantity;
    });

    const packagePayload = {
      weight: totalWeight,
      width: Math.max(maxWidth, 11),
      height: Math.max(totalHeight, 2),
      length: Math.max(maxLength, 16),
    };

    const recipientPayload = {
        name: order.profiles.full_name,
        phone: String(order.profiles.phone || '').replace(/\D/g, ''),
        email: order.profiles.email,
        document: String(order.profiles.cpf || '').replace(/\D/g, ''),
        address: order.shipping_street,
        complement: order.shipping_complement,
        number: order.shipping_number || 'S/N',
        district: order.shipping_neighborhood,
        city: order.shipping_city,
        state_abbr: order.shipping_state,
        country_id: "BR",
        postal_code: String(order.shipping_zip_code || '').replace(/\D/g, ''),
    };
    
    // 3. ETAPA 1: Criar o envio
    const shipment = await fetchMelhorEnvio('/api/v2/me/shipment', {
        method: 'POST',
        body: JSON.stringify({
            service: order.shipping_service_id,
            from: { postal_code: "39400001" }, // CEP do remetente
            to: recipientPayload,
            package: packagePayload,
            options: {
                insurance_value: totalValue,
                receipt: false,
                own_hand: false,
                reverse: false,
                non_commercial: true,
            }
        })
    });
    const shipmentId = shipment.id;
    const trackingCode = shipment.tracking;

    // 4. ETAPA 2: Pagar o envio (automático no sandbox)
    await fetchMelhorEnvio('/api/v2/me/shipment/purchase', {
        method: 'POST',
        body: JSON.stringify({ shipments: [shipmentId] })
    });

    // 5. ETAPA 3: Gerar a etiqueta
    await fetchMelhorEnvio('/api/v2/me/shipment/generate', {
        method: 'POST',
        body: JSON.stringify({ shipments: [shipmentId] })
    });

    // 6. ETAPA 4: Obter o link de impressão
    const printData = await fetchMelhorEnvio('/api/v2/me/shipment/print', {
        method: 'POST',
        body: JSON.stringify({ mode: 'private', orders: [shipmentId] })
    });
    const labelUrl = printData.url;

    // 7. Atualizar o pedido no Supabase com o código de rastreio e status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'shipped', tracking_code: trackingCode })
      .eq('id', orderId);
    if (updateError) throw new Error(`Erro ao atualizar o pedido no banco de dados: ${updateError.message}`);

    // 8. Retornar a URL da etiqueta para o frontend
    return new Response(JSON.stringify({ labelUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função generate-shipping-label:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})