import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// CORS headers para permitir a comunicação
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Crie um cliente Supabase com a chave de serviço para poder modificar o banco de dados
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Lida com a requisição de pre-flight do CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Extrai os dados enviados pelo Abacate Pay
    const payload = await req.json()
    console.log("Webhook payload received:", payload);

    // O payload do Abacate Pay para um PIX pago tem um formato específico.
    // Vamos assumir que ele envia um objeto 'data' com o 'id' da cobrança e o 'status'.
    const pixChargeId = payload?.data?.id;
    const paymentStatus = payload?.data?.status;

    if (!pixChargeId || !paymentStatus) {
      throw new Error("Payload inválido do webhook: 'id' ou 'status' não encontrados.");
    }

    // 2. Verifica se o pagamento foi confirmado
    if (paymentStatus === 'PAID' || paymentStatus === 'CONFIRMED') {
      // 3. Encontra o pedido no banco de dados usando o ID da cobrança PIX
      const { data: order, error: findError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('pix_charge_id', pixChargeId)
        .single();

      if (findError) {
        // Se o pedido não for encontrado, pode não ser um erro crítico (talvez um teste),
        // mas é bom registrar.
        console.warn(`Pedido com pix_charge_id ${pixChargeId} não encontrado.`);
        return new Response(JSON.stringify({ message: "Pedido não encontrado." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Atualiza o status do pedido para 'processing' se ele ainda estiver 'pending'
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

    // 5. Retorna uma resposta de sucesso para o Abacate Pay
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