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

// Pega a chave secreta das variáveis de ambiente do Supabase
const WEBHOOK_SECRET = Deno.env.get("ABACATE_WEBHOOK_SECRET")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verificação de Segurança
    const url = new URL(req.url);
    const receivedSecret = url.searchParams.get('secret');

    if (!WEBHOOK_SECRET) {
      console.error("ABACATE_WEBHOOK_SECRET não está configurado nas variáveis de ambiente.");
      return new Response("Configuração interna do webhook incompleta.", { status: 500 });
    }

    if (receivedSecret !== WEBHOOK_SECRET) {
      console.warn("Tentativa de acesso ao webhook com chave inválida.");
      return new Response("Acesso não autorizado.", { status: 401 });
    }

    // 2. Processamento do Payload (como antes)
    const payload = await req.json()
    console.log("Webhook payload received:", payload);

    const pixChargeId = payload?.data?.id;
    const paymentStatus = payload?.data?.status;

    if (!pixChargeId || !paymentStatus) {
      throw new Error("Payload inválido do webhook: 'id' ou 'status' não encontrados.");
    }

    if (paymentStatus === 'PAID' || paymentStatus === 'CONFIRMED') {
      const { data: order, error: findError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('pix_charge_id', pixChargeId)
        .single();

      if (findError) {
        console.warn(`Pedido com pix_charge_id ${pixChargeId} não encontrado.`);
        return new Response(JSON.stringify({ message: "Pedido não encontrado." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status === 'pending') {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', order.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar o pedido ${order.id}: ${updateError.message}`);
        }
        console.log(`Pedido ${order.id} atualizado para 'processing'.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})