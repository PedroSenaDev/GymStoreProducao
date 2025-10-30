import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// NOTE: The ABACATE_API_KEY secret must be set in your Supabase project settings.
const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Check for API key
  if (!ABACATE_API_KEY) {
    return new Response(JSON.stringify({ error: "Abacate Pay API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get data from client
    const { amount, customerName, customerEmail, customerMobile, customerDocument } = await req.json()

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      return new Response(JSON.stringify({ error: "Missing required customer fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare the request for the correct Abacate Pay API endpoint
    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const apiOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Amount in cents
        expiresIn: 3600, // 1 hour expiration
        description: "Pagamento do pedido - GYMSTORE",
        customer: {
          name: customerName,
          cellphone: customerMobile,
          email: customerEmail,
          taxId: customerDocument.replace(/\D/g, ''), // Remove non-digits
        },
      })
    };

    // Call the Abacate Pay API
    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    // Handle API errors
    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Error:", responseData);
      throw new Error(responseData.error?.message || "Failed to generate Pix charge.");
    }

    // Extract the necessary data from the successful response
    const { id: pixChargeId, brCode, brCodeBase64 } = responseData.data;

    if (!pixChargeId || !brCode || !brCodeBase64) {
        throw new Error("Pix details not found in Abacate Pay response.");
    }

    // Send the data back to the client in the expected format
    return new Response(JSON.stringify({ 
        pix_charge_id: pixChargeId,
        br_code: brCode,
        qr_code_url: brCodeBase64, // The base64 string is a data URI for the image
    }), {
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