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
    const { pix_charge_id } = await req.json()

    if (!pix_charge_id) {
      return new Response(JSON.stringify({ error: "Pix charge ID is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://api.abacatepay.com/v1/pixQrCode/check/${pix_charge_id}`;
    const apiOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
      }
    };

    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Check Error:", responseData);
      throw new Error(responseData.error?.message || "Failed to check Pix status.");
    }

    return new Response(JSON.stringify(responseData.data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})