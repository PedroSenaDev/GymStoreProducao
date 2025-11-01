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
    <tr style="border-bottom: 1px solid #eaeaea;">
      <td style="padding: 12px 0;">${item.products.name}</td>
      <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; color: #333; line-height: 1.5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 8px; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #111; margin: 0;">GYMSTORE</h1>
        </div>
        <h2 style="font-size: 20px; color: #111;">Pagamento Aprovado!</h2>
        <p>Olá, ${order.profiles.full_name},</p>
        <p>Seu pagamento para o pedido <strong>#${order.id.substring(0, 8)}</strong> foi confirmado com sucesso. Já estamos preparando tudo para o envio!</p>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 30px; font-size: 16px;">Resumo do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="padding: 8px 0; text-align: left; color: #888; font-size: 12px; text-transform: uppercase;">Produto</th>
              <th style="padding: 8px 0; text-align: center; color: #888; font-size: 12px; text-transform: uppercase;">Qtd.</th>
              <th style="padding: 8px 0; text-align: right; color: #888; font-size: 12px; text-transform: uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p style="text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px; border-top: 2px solid #eee; padding-top: 15px;">
          Total: ${formatCurrency(order.total_amount)}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gymstoremoc.vercel.app/profile/orders" style="display: inline-block; background-color: #111; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Acompanhar Meus Pedidos
          </a>
        </div>
        <p>Agradecemos pela sua preferência!</p>
        <p>Atenciosamente,<br>Equipe GYMSTORE</p>
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #888;">
          <p>&copy; ${new Date().getFullYear()} GYMSTORE. Todos os direitos reservados.</p>
        </div>
      </div>
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
        if (!order.profiles) {
            console.error(`Pedido ${order.id}: Perfil do usuário não encontrado. Não é possível enviar e-mail.`);
        } else if (!order.profiles.email) {
            console.error(`Pedido ${order.id}: E-mail não encontrado no perfil do usuário. Não é possível enviar e-mail.`);
        } else {
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