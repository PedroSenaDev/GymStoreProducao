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

const WEBHOOK_SECRET = Deno.env.get("ABACATE_WEBHOOK_SECRET")

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const generatePaymentApprovedEmail = (order: any) => {
  const itemsHtml = order.order_items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.products.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1 style="color: #111;">Pagamento Aprovado!</h1>
      <p>Olá, ${order.profiles.full_name}. Seu pagamento para o pedido <strong>#${order.id.substring(0, 8)}</strong> foi confirmado.</p>
      <p>Já estamos preparando tudo para o envio. Agradecemos pela sua compra!</p>
      <h2 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Resumo do Pedido</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">Produto</th>
            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">Qtd.</th>
            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Preço</th>
            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p style="text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px;">
        Total: ${formatCurrency(order.total_amount)}
      </p>
      <p>Para acompanhar o status do seu pedido, acesse a área "Meus Pedidos" em nosso site.</p>
      <p>Atenciosamente,<br>Equipe GYMSTORE</p>
    </div>
  `;
};

serve(async (req) => {
  console.log("Webhook request received at:", new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const receivedSecret = url.searchParams.get('secret');

    if (!WEBHOOK_SECRET) {
      console.error("ABACATE_WEBHOOK_SECRET não está configurado.");
      return new Response("Configuração interna do webhook incompleta.", { status: 500 });
    }

    if (receivedSecret !== WEBHOOK_SECRET) {
      console.warn("Tentativa de acesso ao webhook com chave inválida.");
      return new Response("Acesso não autorizado.", { status: 401 });
    }

    const payload = await req.json()
    console.log("Webhook payload received:", JSON.stringify(payload, null, 2));

    const pixChargeId = payload?.data?.pixQrCode?.id;
    const paymentStatus = payload?.data?.pixQrCode?.status;

    if (!pixChargeId || !paymentStatus) {
      throw new Error("Payload inválido do webhook: 'id' ou 'status' não encontrados.");
    }

    if (paymentStatus === 'PAID' || paymentStatus === 'CONFIRMED') {
      const { data: order, error: findError } = await supabaseAdmin
        .from('orders')
        .select('*, profiles(full_name, email), order_items(*, products(name))')
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

        // Enviar e-mail de confirmação
        const emailHtml = generatePaymentApprovedEmail(order);
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: order.profiles.email,
            subject: `Pagamento Aprovado - Pedido #${order.id.substring(0, 8)}`,
            htmlContent: emailHtml,
          },
        });

        if (emailError) {
          console.error(`Falha ao enviar e-mail para o pedido ${order.id}:`, emailError);
        } else {
          console.log(`E-mail de pagamento aprovado enviado para ${order.profiles.email}`);
        }
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