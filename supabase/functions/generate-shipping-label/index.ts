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

async function fetchMelhorEnvio(endpoint: string, options: RequestInit) {
    const url = `https://sandbox.melhorenvio.com.br${endpoint}`;
    console.log(`[LOG] Chamando API Melhor Envio: ${options.method} ${url}`);
    
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
        console.error(`[ERRO API] Status: ${response.status}, Resposta: ${responseText}`);
        throw new Error(`Erro na API Melhor Envio (${response.status}): ${responseText}`);
    }
    
    try {
        const jsonData = JSON.parse(responseText);
        console.log(`[LOG] Resposta da API recebida com sucesso para ${endpoint}.`);
        return jsonData;
    } catch (e) {
        console.error(`[ERRO PARSE] Resposta inválida (não-JSON) da API: ${responseText}`);
        throw new Error(`A API Melhor Envio retornou uma resposta inválida. Resposta: ${responseText}`);
    }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("[LOG] Iniciando função generate-shipping-label.");
    if (!MELHOR_ENVIO_API_KEY) {
      throw new Error("API Key do Melhor Envio não configurada.");
    }

    const { orderId } = await req.json();
    if (!orderId) throw new Error("ID do pedido é obrigatório.");
    console.log(`[LOG] Gerando etiqueta para o pedido ID: ${orderId}`);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`*, profiles (*), order_items (*, products (*))`)
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Pedido não encontrado: ${orderError.message}`);
    if (order.status !== 'processing') throw new Error("A etiqueta só pode ser gerada para pedidos com status 'Processando'.");
    if (!order.profiles) throw new Error("Dados do perfil do cliente não encontrados.");
    console.log("[LOG] Dados do pedido obtidos do Supabase com sucesso.");

    let totalWeight = 0, totalValue = 0, maxLength = 0, maxWidth = 0, totalHeight = 0;
    order.order_items.forEach((item: any) => {
      const quantity = item.quantity || 1;
      totalWeight += (item.products.weight_kg || 0.1) * quantity;
      totalValue += item.price * quantity;
      maxLength = Math.max(maxLength, item.products.length_cm || 1);
      maxWidth = Math.max(maxWidth, item.products.width_cm || 1);
      totalHeight += (item.products.height_cm || 1) * quantity;
    });

    const packagePayload = { weight: totalWeight, width: Math.max(maxWidth, 11), height: Math.max(totalHeight, 2), length: Math.max(maxLength, 16) };
    
    const senderPayload = {
        name: "GYMSTORE",
        phone: "38999999999", // Use um telefone válido da sua loja
        email: "contato@gymstore.com",
        document: "11111111111111", // Use um CNPJ válido da sua loja
        address: "Rua da Loja",
        number: "123",
        district: "Centro",
        city: "Montes Claros",
        state_abbr: "MG",
        country_id: "BR",
        postal_code: "39400001",
    };

    const recipientPayload = {
        name: order.profiles.full_name, phone: String(order.profiles.phone || '').replace(/\D/g, ''), email: order.profiles.email,
        document: String(order.profiles.cpf || '').replace(/\D/g, ''), address: order.shipping_street, complement: order.shipping_complement,
        number: order.shipping_number || 'S/N', district: order.shipping_neighborhood, city: order.shipping_city,
        state_abbr: order.shipping_state, country_id: "BR", postal_code: String(order.shipping_zip_code || '').replace(/\D/g, ''),
    };
    console.log("[LOG] Payloads do pacote e destinatário preparados.");
    
    // ETAPA 1: Adicionar envio ao carrinho
    const cartItem = await fetchMelhorEnvio('/api/v2/me/cart', {
        method: 'POST',
        body: JSON.stringify({
            service: order.shipping_service_id, 
            from: senderPayload, 
            to: recipientPayload,
            products: order.order_items.map((item: any) => ({ name: item.products.name, quantity: item.quantity, unitary_value: item.price })),
            package: packagePayload,
            options: { insurance_value: totalValue, receipt: false, own_hand: false, reverse: false, non_commercial: true }
        })
    });
    const cartId = cartItem.id;
    console.log(`[LOG] Envio adicionado ao carrinho da Melhor Envio. ID do Carrinho: ${cartId}`);

    // ETAPA 2: Pagar/Finalizar o carrinho
    const checkout = await fetchMelhorEnvio('/api/v2/me/cart/checkout', {
        method: 'POST',
        body: JSON.stringify({ orders: [cartId] })
    });
    const purchase = checkout.purchase;
    const shipmentId = purchase.orders[0].id;
    const trackingCode = purchase.orders[0].tracking;
    console.log(`[LOG] Checkout do carrinho realizado. ID do Envio: ${shipmentId}, Rastreio: ${trackingCode}`);

    // ETAPA 3: Gerar a etiqueta
    await fetchMelhorEnvio('/api/v2/me/shipment/generate', {
        method: 'POST',
        body: JSON.stringify({ orders: [shipmentId] })
    });
    console.log("[LOG] Geração da etiqueta solicitada.");

    // ETAPA 4: Obter o link de impressão
    const printData = await fetchMelhorEnvio('/api/v2/me/shipment/print', {
        method: 'POST',
        body: JSON.stringify({ mode: 'private', orders: [shipmentId] })
    });
    const labelUrl = printData.url;
    console.log(`[LOG] URL da etiqueta obtida: ${labelUrl}`);

    // ETAPA 5: Atualizar o pedido no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'shipped', tracking_code: trackingCode })
      .eq('id', orderId);
    if (updateError) throw new Error(`Erro ao atualizar o pedido no banco de dados: ${updateError.message}`);
    console.log("[LOG] Pedido atualizado no Supabase para 'shipped'.");

    return new Response(JSON.stringify({ labelUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ERRO FATAL] Erro na função generate-shipping-label:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})