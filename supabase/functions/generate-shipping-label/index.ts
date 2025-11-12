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

    const data = await response.json();

    if (!response.ok) {
        // Extrai a mensagem de erro específica da API para um feedback claro
        const errorMessage = data?.message || data?.error || (data?.errors ? JSON.stringify(data.errors) : 'Erro desconhecido na API Melhor Envio.');
        throw new Error(`Erro na API Melhor Envio (${response.status}): ${errorMessage}`);
    }

    return data;
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
      .select(`
        *,
        profiles (full_name, phone, email, cpf),
        order_items (*, products (*))
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Pedido não encontrado: ${orderError.message}`);
    if (order.status !== 'processing') throw new Error("A etiqueta só pode ser gerada para pedidos com status 'Processando'.");
    if (!order.profiles) throw new Error("Dados do perfil do cliente não encontrados.");

    // 2. Buscar endereço do remetente na Melhor Envio
    const senderAddresses = await fetchMelhorEnvio('/api/v2/me/companies/addresses', { method: 'GET' });
    if (!senderAddresses || senderAddresses.data.length === 0) {
        throw new Error("Nenhum endereço de remetente encontrado na sua conta Melhor Envio. Por favor, cadastre um endereço no painel da Melhor Envio.");
    }
    // Usa o endereço padrão ou o primeiro da lista
    const senderAddress = senderAddresses.data.find((addr: any) => addr.default) || senderAddresses.data[0];
    const senderAddressId = senderAddress.id;

    // 3. Preparar dados do pacote e destinatário
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    const productsPayload = order.order_items.map((item: any) => {
      if (!item.products) {
        throw new Error(`O produto com ID ${item.product_id} neste pedido não foi encontrado. Ele pode ter sido excluído.`);
      }
      const quantity = item.quantity || 1;
      totalWeight += (item.products.weight_kg || 0.1) * quantity;
      maxLength = Math.max(maxLength, item.products.length_cm || 1);
      maxWidth = Math.max(maxWidth, item.products.width_cm || 1);
      totalHeight += (item.products.height_cm || 1) * quantity;
      return {
        name: item.products.name,
        quantity: quantity,
        unitary_value: item.price,
      };
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

    if (!recipientPayload.name || !recipientPayload.document || !recipientPayload.postal_code || !recipientPayload.address) {
        throw new Error("Informações críticas do destinatário (nome, CPF, CEP, rua) estão faltando no cadastro do cliente.");
    }

    // 4. Adicionar envio ao carrinho do Melhor Envio
    const cartData = await fetchMelhorEnvio('/api/v2/me/shipment/cart', {
        method: 'POST',
        body: JSON.stringify({
            service: order.shipping_service_id,
            from: { address_id: senderAddressId }, // Usando o ID do endereço do remetente
            to: recipientPayload,
            products: productsPayload,
            package: packagePayload,
            options: {
                insurance_value: order.total_amount,
                receipt: false,
                own_hand: false,
                reverse: false,
                non_commercial: true,
            }
        })
    });
    const cartItemId = cartData.id;

    // 5. Comprar a etiqueta (Checkout)
    await fetchMelhorEnvio('/api/v2/me/shipment/checkout', {
        method: 'POST',
        body: JSON.stringify({ orders: [cartItemId] })
    });

    // 6. Gerar a etiqueta para impressão
    await fetchMelhorEnvio('/api/v2/me/shipment/generate', {
        method: 'POST',
        body: JSON.stringify({ orders: [cartItemId] })
    });

    // 7. Imprimir a etiqueta para obter o link e o código de rastreio
    const printData = await fetchMelhorEnvio('/api/v2/me/shipment/print', {
        method: 'POST',
        body: JSON.stringify({ mode: 'private', orders: [cartItemId] })
    });
    
    const labelUrl = printData.url;
    const trackingCode = cartData.tracking;

    // 8. Atualizar o pedido no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'shipped', tracking_code: trackingCode })
      .eq('id', orderId);
    if (updateError) throw new Error(`Erro ao atualizar o pedido no banco de dados: ${updateError.message}`);

    // 9. Retornar a URL da etiqueta para o frontend
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