import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ABACATE_WEBHOOK_SECRET = Deno.env.get("ABACATE_WEBHOOK_SECRET")

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 })
  }

  try {
    const body = await req.json();
    const signature = req.headers.get("X-Abacatepay-Signature");

    // 1. Validação do Webhook Secret (MANDATÓRIO)
    if (!ABACATE_WEBHOOK_SECRET || signature !== ABACATE_WEBHOOK_SECRET) {
        console.error("Webhook: Assinatura inválida ou secreta ausente.");
        return new Response("Unauthorized", { status: 401 });
    }

    const eventType = body.event;
    const status = body.data?.status; // Ex: PAID, PENDING, EXPIRED
    const chargeId = body.data?.id;
    // O externalId agora vem do campo metadata que enviamos na criação da cobrança
    const orderId = body.data?.metadata?.orderId; 
    const userId = body.data?.metadata?.userId;

    if (eventType === 'billing_updated' && status === 'PAID' && orderId && userId) {
        // 2. Buscar o pedido correspondente usando o orderId
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, status')
            .eq('id', orderId)
            .maybeSingle();

        if (fetchError) throw new Error(`Erro ao buscar pedido: ${fetchError.message}`);

        if (order && order.status === 'pending') {
            // 3. Atualizar o status do pedido para 'processing'
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'processing', pix_charge_id: chargeId })
                .eq('id', order.id);

            if (updateError) throw new Error(`Erro ao atualizar status do pedido: ${updateError.message}`);
            
            console.log(`Pedido ${order.id} atualizado para 'processing' via webhook Pix (Abacate Pay Billing).`);

            // 4. Decrementar Estoque
            const { data: orderItems, error: itemsError } = await supabaseAdmin
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', order.id);

            if (itemsError) {
                console.error(`Falha ao buscar itens para decremento de estoque: ${itemsError.message}`);
            } else {
                const stockUpdates = orderItems.map(item => 
                    supabaseAdmin.rpc('decrement_product_stock', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity
                    })
                );
                await Promise.all(stockUpdates);
                console.log(`Estoque decrementado para pedido ${order.id}.`);
            }

            // 5. Limpar o carrinho (todos os itens do usuário, pois o pedido foi criado com base nos selecionados)
            const { error: cartClearError } = await supabaseAdmin
                .from('cart_items')
                .delete()
                .eq('user_id', userId); // Usamos o userId do metadata

            if (cartClearError) {
                console.error(`Falha ao limpar o carrinho do usuário ${userId}:`, cartClearError);
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Erro no webhook do Pix:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});