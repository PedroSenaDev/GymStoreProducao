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
    console.error("ABACATE_API_KEY is missing in environment variables.");
    return new Response(JSON.stringify({ error: "Abacate Pay API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get data from client
    const payload = await req.json()
    const { amount, customerName, customerEmail, customerMobile, customerDocument } = payload

    // Log the received payload for debugging
    console.log("Received Pix Payload:", JSON.stringify(payload));

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      console.error("Missing required customer fields in payload.");
      console.error(`Validation check: amount=${!!amount}, name=${!!customerName}, email=${!!customerEmail}, mobile=${!!customerMobile}, document=${!!customerDocument}`);
      return new Response(JSON.stringify({ error: "Missing required customer fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare the request for the correct Abacate Pay API endpoint
    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const requestBody = {
        amount: Math.round(amount * 100), // Amount in cents
        expiresIn: 3600, // 1 hour expiration
        description: "Pagamento do pedido - GYMSTORE",
        customer: {
          name: customerName,
          cellphone: customerMobile.replace(/\D/g, ''), // Clean phone number
          email: customerEmail,
          taxId: customerDocument.replace(/\D/g, ''), // Clean CPF/CNPJ
        },
    };

    const apiOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    // Call the Abacate Pay API
    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    // Handle API errors
    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Error Response:", responseData);
      // Retorna uma mensagem de erro mais específica da API externa
      const errorMessage = responseData.error?.message || responseData.message || "Failed to generate Pix charge.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the necessary data from the successful response
    const { id: pixChargeId, brCode, brCodeBase64 } = responseData.data;

    if (!pixChargeId || !brCode || !brCodeBase64) {
        console.error("Pix details missing in successful Abacate Pay response:", responseData);
        throw new Error("Pix details not found in Abacate Pay response.");
    }

    // The base64 string needs the data URI prefix to be used directly in an <img> tag
    const qrCodeUrl = `data:image/png;base64,${brCodeBase64}`;

    // Send the data back to the client in the expected format
    return new Response(JSON.stringify({ 
        pix_charge_id: pixChargeId,
        br_code: brCode,
        qr_code_url: qrCodeUrl,
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