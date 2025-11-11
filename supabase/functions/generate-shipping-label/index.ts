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

// Dados do remetente (Sua loja)
const SENDER_DATA = {
    name: "GYMSTORE",
    phone: "38999999999",
    email: "contato@gymstore.com",
    document: "11111111111111", // CNPJ da loja
    company_document: "11111111111111",
    state_register: "isento",
    address: "Praça Doutor Carlos",
    complement: "Centro",
    number: "150",
    district: "Centro",
    city: "Montes Claros",
    state_abbr: "MG",
    country_id: "BR",
    postal_code: "39400001",
    note: "Nota fiscal"
};

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

    // 1. Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        profiles (full_name, phone, email, cpf),
        shipping_address:addresses (*),
        order_items (*, products (*))
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Pedido não encontrado: ${orderError.message}`);
    if (order.status !== 'processing') throw new Error("A etiqueta só pode ser gerada para pedidos com status 'Processando'.");

    // Validações de dados críticos
    if (!order.profiles) throw new Error("Dados do perfil do cliente não encontrados.");
    if (!order.shipping_address) throw new Error("Endereço de entrega não encontrado.");

    // 2. Preparar dados para a API do Melhor Envio
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    const productsPayload = order.order_items.map((item: any) => {
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
        phone: (order.profiles.phone || '').replace(/\D/g, ''),
        email: order.profiles.email,
        document: (order.profiles.cpf || '').replace(/\D/g, ''),
        address: order.shipping_address.street,
        complement: order.shipping_address.complement,
        number: order.shipping_address.number,
        district: order.shipping_address.neighborhood,
        city: order.shipping_address.city,
        state_abbr: order.shipping_address.state,
        country_id: "BR",
        postal_code: (order.shipping_address.zip_code || '').replace(/\D/g, ''),
    };

    if (!recipientPayload.name || !recipientPayload.document || !recipientPayload.postal_code || !recipientPayload.address) {
        throw new Error("Informações críticas do destinatário (nome, CPF, CEP, rua) estão faltando no cadastro do cliente.");
    }

    // 3. Adicionar envio ao carrinho do Melhor Envio
    const cartResponse = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/cart', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
            'User-Agent': 'GYMSTORE (contato@gymstore.com)'
        },
        body: JSON.stringify({
            service: order.shipping_service_id,
            from: SENDER_DATA,
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

    const cartData = await cartResponse.json();
    if (!cartResponse.ok) throw new Error(`Erro ao adicionar ao carrinho ME: ${JSON.stringify(cartData.errors || cartData)}`);
    const cartItemId = cartData.id;

    // 4. Comprar a etiqueta (Checkout)
    const checkoutResponse = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
        },
        body: JSON.stringify({ orders: [cartItemId] })
    });
    if (!checkoutResponse.ok) throw new Error("Erro ao comprar a etiqueta no Melhor Envio.");

    // 5. Gerar a etiqueta para impressão
    const generateResponse = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/generate', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
        },
        body: JSON.stringify({ orders: [cartItemId] })
    });
    if (!generateResponse.ok) throw new Error("Erro ao gerar a etiqueta para impressão.");

    // 6. Imprimir a etiqueta para obter o link e o código de rastreio
    const printResponse = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/print', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
        },
        body: JSON.stringify({ mode: 'private', orders: [cartItemId] })
    });
    
    const printData = await printResponse.json();
    if (!printResponse.ok) throw new Error(`Erro ao imprimir a etiqueta: ${JSON.stringify(printData)}`);
    
    const labelUrl = printData.url;
    const trackingCode = cartData.tracking;

    // 7. Atualizar o pedido no Supabase
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