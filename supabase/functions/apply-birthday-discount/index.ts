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
    const { userId } = await req.json();
    if (!userId) throw new Error("ID do usuário é obrigatório.");

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

    if (settings.birthday_discount_enabled !== 'true') {
      return new Response(JSON.stringify({ discountPercentage: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("birth_date, last_birthday_reward_at")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;

    // 3. Validar as condições
    if (!profile.birth_date) {
      return new Response(JSON.stringify({ discountPercentage: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const birthday = new Date(`${profile.birth_date}T00:00:00`);
    const isBirthday = today.getDate() === birthday.getDate() && today.getMonth() === birthday.getMonth();
    
    const lastRewardDate = profile.last_birthday_reward_at ? new Date(profile.last_birthday_reward_at) : null;
    const hasClaimedThisYear = lastRewardDate && lastRewardDate.getFullYear() === today.getFullYear();

    if (isBirthday && !hasClaimedThisYear) {
      return new Response(JSON.stringify({ discountPercentage: Number(settings.birthday_discount_percentage || 0) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Se não for elegível, retorna 0
    return new Response(JSON.stringify({ discountPercentage: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função apply-birthday-discount:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})