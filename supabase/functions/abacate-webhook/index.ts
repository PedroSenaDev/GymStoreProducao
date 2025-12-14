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

const ABACATE_WEBHOOK_SECRET = Deno.env.get("ABACATE_WEBHOOK_SECRET")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const signature = req.headers.get("X-AbacatePay-Signature");

    // 1. Verificar a assinatura do Webhook (Segurança)
    if (!ABACATE_WEBHOOK_SECRET) {
        console.error("ABACATE_WEBHOOK_SECRET não configurado.");
        return new Response("Webhook secret not configured.", { status: 500 });
    }
    
    // 2. Processar o evento
    const eventType = body.event;
    const data = body.data;

    if (eventType === 'billing.paid') {
      const metadata = data.metadata;
      const userId = metadata?.userId;
      const chargeId = data.id; // ID da cobrança na Abacate Pay

      if (!userId || !metadata?.orderItems) {
        console.error("Webhook Abacate: Metadados essenciais ausentes (userId ou orderItems).", metadata);
        return new Response("Missing metadata.", { status: 400 });
      }

      const orderItemsPayload = JSON.parse(metadata.orderItems);
      const totalAmount = parseFloat(metadata.totalAmount || '0');
      const shippingCost = parseFloat(metadata.shippingCost || '0');

      // 3. Criar o Pedido (Status 'processing' porque o pagamento foi confirmado)
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: userId,
            total_amount: totalAmount,
            status: 'processing',
            payment_method: metadata.paymentMethod,
            shipping_cost: shippingCost,
            pix_charge_id: chargeId,
            shipping_service_id: metadata.shippingRateId,
            shipping_service_name: metadata.shippingRateName,
            delivery_time: metadata.deliveryTime,
            shipping_address_id: metadata.shippingAddressId,
            // Snapshot do endereço
            shipping_street: metadata.shipping_street,
            shipping_number: metadata.shipping_number,
            shipping_complement: metadata.shipping_complement,
            shipping_neighborhood: metadata.shipping_neighborhood,
            shipping_city: metadata.shipping_city,
            shipping_state: metadata.shipping_state,
            shipping_zip_code: metadata.shipping_zip_code,
        })
        .select('id')
        .single();
      
      if (orderError) {
        console.error(`ERRO CRÍTICO AO CRIAR PEDIDO (Abacate Webhook): ${orderError.message}`, { userId, chargeId });
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }
      const orderId = orderData.id;

      // 4. Criar os Itens do Pedido
      const finalOrderItemsPayload = orderItemsPayload.map((item: any) => ({
        ...item,
        order_id: orderId,
        // selected_color já está no formato JSONB correto
      }));

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(finalOrderItemsPayload);
      if (itemsError) {
        // Se falhar, tentamos reverter o pedido
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        console.error(`ERRO CRÍTICO AO SALVAR ITENS (Abacate Webhook): ${itemsError.message}`, { orderId });
        throw new Error(`Erro ao salvar itens do pedido: ${itemsError.message}`);
      }

      // 5. Decrementar Estoque
      const stockUpdates = orderItemsPayload.map((item: any) => 
        supabaseAdmin.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        })
      );
      
      await Promise.all(stockUpdates);

      // 6. Limpar os itens do carrinho que foram comprados
      const { error: cartClearError } = await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', userId);
      
      if (cartClearError) {
          console.error(`Falha ao limpar o carrinho do usuário ${userId}:`, cartClearError);
      }

      console.log(`Webhook Abacate: Pedido ${orderId} criado e atualizado para 'processing'.`);
      return new Response(JSON.stringify({ received: true, orderId: orderId }), { status: 200 });
    }

    // Se o evento for 'billing.failed' ou 'billing.canceled', não há pedido para cancelar, pois ele não foi criado.
    // Apenas logamos o evento.
    if (eventType === 'billing.failed' || eventType === 'billing.canceled') {
        console.log(`Webhook Abacate: Evento ${eventType} recebido. Nenhum pedido criado.`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: `Event type ${eventType} ignored.` }), { status: 200 });

  } catch (err) {
    console.error("Erro no webhook da Abacate Pay:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});