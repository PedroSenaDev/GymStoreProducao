import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!ABACATE_API_KEY) {
    return new Response(JSON.stringify({ error: "Chave da API Abacate Pay não configurada." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Buscar todos os pedidos pendentes que têm um ID de cobrança Pix
    const { data: pendingOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, pix_charge_id')
      .eq('status', 'pending')
      .not('pix_charge_id', 'is', null);

    if (fetchError) throw new Error(`Erro ao buscar pedidos: ${fetchError.message}`);

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum pedido pendente para sincronizar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updatedCount = 0;

    // 2. Verificar o status de cada pedido com a Abacate Pay
    const checkPromises = pendingOrders.map(async (order) => {
      const apiUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${order.pix_charge_id}`;
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${ABACATE_API_KEY}` }
      });
      const result = await response.json();

      if (response.ok && (result.data?.status === 'PAID' || result.data?.status === 'CONFIRMED')) {
        // 3. Se estiver pago, atualiza o status no Supabase
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`Falha ao atualizar pedido ${order.id}:`, updateError.message);
        } else {
          updatedCount++;
          console.log(`Pedido ${order.id} atualizado para 'processing'.`);
        }
      }
    });

    await Promise.all(checkPromises);

    return new Response(JSON.stringify({ message: `${updatedCount} de ${pendingOrders.length} pedidos pendentes foram atualizados.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na sincronização:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})