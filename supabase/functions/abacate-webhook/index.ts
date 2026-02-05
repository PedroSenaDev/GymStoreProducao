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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const eventType = body.event;
    const billingData = body.data?.billing;

    if (eventType === 'billing.paid') {
      if (!billingData) {
        return new Response("Missing billing data.", { status: 400 });
      }

      const metadata = billingData.metadata;
      const userId = metadata?.userId;
      const chargeId = billingData.id;

      if (!userId || !metadata?.orderItems) {
        return new Response("Missing metadata.", { status: 400 });
      }

      const orderItemsPayload = JSON.parse(metadata.orderItems);
      const totalAmount = parseFloat(metadata.totalAmount || '0');
      const shippingCost = parseFloat(metadata.shippingCost || '0');

      // 1. Criar o Pedido
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
      
      if (orderError) throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      const orderId = orderData.id;

      // 2. Criar os Itens do Pedido
      const finalOrderItemsPayload = orderItemsPayload.map((item: any) => ({
        ...item,
        order_id: orderId,
      }));

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(finalOrderItemsPayload);
      if (itemsError) {
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        throw new Error(`Erro ao salvar itens do pedido: ${itemsError.message}`);
      }

      // 3. Baixa de Estoque por Variante (Tamanho + Cor)
      const stockUpdates = orderItemsPayload.map((item: any) => 
        supabaseAdmin.rpc('decrement_product_variant_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_size: item.selected_size,
          p_color_code: item.selected_color?.code || null
        })
      );
      
      await Promise.all(stockUpdates);

      // 4. Limpar o carrinho
      const cartItemDeletions = orderItemsPayload.map((item: any) => {
        const colorCode = item.selected_color?.code || null;
        const size = item.selected_size || null;
        return supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', item.product_id)
          .eq('selected_size', size)
          .eq('selected_color', colorCode);
      });
      
      await Promise.all(cartItemDeletions);

      console.log(`[abacate-webhook] Pedido ${orderId} processado.`);
      return new Response(JSON.stringify({ received: true, orderId: orderId }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: `Event ${eventType} ignored.` }), { status: 200 });

  } catch (err) {
    console.error("[abacate-webhook] Erro:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});