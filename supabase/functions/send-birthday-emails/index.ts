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

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")

// Template de e-mail criativo e bonito
const createEmailContent = (name: string, discount: string, siteUrl: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f7; color: #333; line-height: 1.5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 8px; padding: 40px; text-align: center; }
    .header { margin-bottom: 30px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: 0.1em; color: #111; margin: 0; }
    .gift-icon { font-size: 40px; color: #FFD700; margin-bottom: 15px; }
    h2 { color: #111; font-size: 22px; margin-top: 0; }
    .discount-box { background-color: #111; color: #ffffff; padding: 15px 25px; border-radius: 6px; font-size: 24px; font-weight: bold; margin: 20px auto; width: fit-content; }
    .button { display: inline-block; background-color: #E53E3E; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>GYMSTORE</h1></div>
    <div class="gift-icon">🎁</div>
    <h2>Parabéns, ${name}!</h2>
    <p>Nós da GYMSTORE queremos celebrar o seu mês de aniversário com um presente especial:</p>
    <p style="font-size: 18px; font-weight: 600; color: #E53E3E;">Um desconto exclusivo de:</p>
    <div class="discount-box">${discount}% OFF</div>
    <p>Use este desconto em qualquer compra que você fizer hoje para elevar seu treino!</p>
    <a href="${siteUrl}/products" class="button">Aproveitar Meu Presente Agora</a>
    <p style="font-size: 12px; color: #888;">O desconto será aplicado automaticamente no checkout no dia do seu aniversário.</p>
    <p>Atenciosamente,<br>Equipe GYMSTORE</p>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} GYMSTORE</p></div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!BREVO_API_KEY) {
    console.error("BREVO_API_KEY not set.");
    return new Response(JSON.stringify({ error: "Email service not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Mês atual (1 a 12)
    const currentYear = today.getFullYear();
    const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://gymstoremoc.vercel.app';

    // 1. Buscar configurações de desconto
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["birthday_discount_enabled", "birthday_discount_percentage"]);
    if (settingsError) throw settingsError;

    const settings = settingsData.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const discountPercentage = settings.birthday_discount_percentage;
    if (settings.birthday_discount_enabled !== 'true' || !discountPercentage) {
      return new Response(JSON.stringify({ message: "Desconto de aniversário desativado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar clientes que fazem aniversário este mês e que ainda não foram notificados este ano
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, birth_date, last_birthday_reward_at")
      .not("birth_date", "is", null);
    
    if (profilesError) throw profilesError;

    let emailsSent = 0;
    const updatePromises: Promise<any>[] = [];
    const emailPromises: Promise<any>[] = [];

    profiles.forEach(profile => {
      if (!profile.birth_date || !profile.email) return;

      const birthDate = new Date(`${profile.birth_date}T00:00:00`);
      const birthMonth = birthDate.getMonth() + 1;
      
      const lastRewardYear = profile.last_birthday_reward_at 
        ? new Date(profile.last_birthday_reward_at).getFullYear() 
        : 0;

      // Verifica se é o mês de aniversário E se o e-mail ainda não foi enviado este ano
      if (birthMonth === currentMonth && lastRewardYear < currentYear) {
        
        const emailContent = createEmailContent(
          profile.full_name || 'Cliente', 
          discountPercentage, 
          siteUrl
        );

        // 3. Enviar e-mail
        emailPromises.push(
          fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': BREVO_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'GYMSTORE', email: 'gymstoreemoc@gmail.com' },
              to: [{ email: profile.email }],
              subject: `🎁 Presente de Aniversário da GYMSTORE! ${discountPercentage}% OFF`,
              htmlContent: emailContent,
            }),
          }).then(res => {
            if (res.ok) {
              emailsSent++;
              // 4. Atualizar o campo last_birthday_reward_at para o ano atual, 
              // mas mantendo o dia e mês do aniversário para que o desconto no checkout funcione.
              // NOTA: O desconto no checkout fará a atualização final para o dia exato.
              // Aqui, apenas marcamos que o e-mail foi enviado este ano.
              const nextRewardDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
              updatePromises.push(
                supabaseAdmin
                  .from('profiles')
                  .update({ last_birthday_reward_at: nextRewardDate.toISOString() })
                  .eq('id', profile.id)
              );
            } else {
              console.error(`Falha ao enviar e-mail para ${profile.email}:`, res.status);
            }
          })
        );
      }
    });

    await Promise.all(emailPromises);
    await Promise.all(updatePromises);

    return new Response(JSON.stringify({ message: `${emailsSent} e-mail(s) de aniversário enviados com sucesso.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função send-birthday-emails:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})