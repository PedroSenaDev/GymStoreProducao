import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")

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

  if (!BREVO_API_KEY) {
    return new Response(JSON.stringify({ error: "Serviço de e-mail não configurado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { subject, htmlContent } = await req.json();
    if (!subject || !htmlContent) {
      return new Response(JSON.stringify({ error: "Assunto e conteúdo são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar todos os e-mails de usuários cadastrados
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .not('email', 'is', null);

    if (profileError) throw new Error(`Erro ao buscar e-mails: ${profileError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário para enviar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = profiles.map(p => ({ email: p.email }));

    // Enviar um único e-mail com todos os destinatários em cópia oculta (BCC)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GYMSTORE', email: 'contato@gymstore.com' },
        to: [{ name: 'GYMSTORE', email: 'contato@gymstore.com' }], // Envia para si mesmo
        bcc: recipients, // Coloca todos os clientes em cópia oculta
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      throw new Error("Falha ao enviar a campanha via Brevo.");
    }

    return new Response(JSON.stringify({ success: true, sentTo: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função send-campaign:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})