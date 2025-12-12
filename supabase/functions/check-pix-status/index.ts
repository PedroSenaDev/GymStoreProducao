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
    const { pix_charge_id } = await req.json();
    if (!pix_charge_id) throw new Error("Pix Charge ID is required.");

    const apiUrl = `https://api.abacatepay.com/v1/pixQrCode/status/${pix_charge_id}`;

    const apiOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
    };

    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error("Abacate Pay Status API Error Response:", responseData);
      const errorMessage = responseData.error?.message || responseData.message || "Failed to check Pix status.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna o status (e.g., 'PENDING', 'PAID', 'EXPIRED')
    return new Response(JSON.stringify({ status: responseData.data.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in check-pix-status function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})