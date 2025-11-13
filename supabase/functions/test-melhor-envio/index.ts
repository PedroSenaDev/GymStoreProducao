import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!MELHOR_ENVIO_API_KEY) {
      throw new Error("A variável MELHOR_ENVIO_API_KEY não está configurada nos secrets do Supabase.");
    }

    const response = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/companies/addresses', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${MELHOR_ENVIO_API_KEY}`,
            'User-Agent': 'GYMSTORE (contato@gymstore.com)',
        },
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Falha na autenticação ou comunicação com a Melhor Envio (Status: ${response.status}). Resposta da API: ${responseText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Conexão com a Melhor Envio bem-sucedida!",
        data: data 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função de teste da Melhor Envio:", error);
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})