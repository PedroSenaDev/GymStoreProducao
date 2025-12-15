import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const eventType = body.event

    // Ignorar eventos que não são pagamento confirmado
    if (eventType !== "billing.paid") {
      return new Response(
        JSON.stringify({ ignored: true }),
        { status: 200, headers: corsHeaders }
      )
    }

    const billing = body.data?.billing

    if (!billing) {
      throw new Error("Payload inválido: billing ausente")
    }

    // Garantia extra
    if (billing.status !== "PAID") {
      return new Response(
        JSON.stringify({ ignored: true }),
        { status: 200, headers: corsHeaders }
      )
    }

    const metadata = billing.metadata
    const orderId = metadata?.orderId

    if (!orderId) {
      throw new Error("orderId não encontrado no metadata")
    }

    // Idempotência: já foi processado?
    const { data: existingOrder, error: findError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle()

    if (findError || !existingOrder) {
      throw new Error(`Pedido ${orderId} não encontrado`)
    }

    if (existingOrder.status === "paid") {
      return new Response(
        JSON.stringify({ ok: true, duplicated: true }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Atualizar pedido como pago
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        pix_charge_id: billing.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateError) {
      throw updateError
    }

    console.log(`Webhook Abacate: Pedido ${orderId} confirmado como pago.`)

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders }
    )

  } catch (err: any) {
    console.error("Erro no webhook AbacatePay:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
