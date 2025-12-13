import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!ABACATE_API_KEY) {
    return new Response(JSON.stringify({ error: "Abacate Pay API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { pixChargeId, externalId } = await req.json();

    if (!pixChargeId || !externalId) {
      return new Response(JSON.stringify({ error: "Missing pixChargeId or externalId." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/update';
    const requestBody = {
        id: pixChargeId,
        metadata: { externalId: externalId }
    };

    const apiOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    if (!response.ok && response.status !== 404) { // 404 pode ocorrer se o Pix expirar, mas queremos logar outros erros
      console.error("Abacate Pay Update API Error Response:", responseData);
      // Não lançamos erro 500 para o cliente, apenas logamos
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in update-pix-external-id function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})