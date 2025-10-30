import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// NOTE: The ABACATE_API_KEY secret must be set in your Supabase project settings.
const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")
const ENCODED_KEY = btoa(`${ABACATE_API_KEY}:`)

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
    const { amount, customerName, customerEmail, customerMobile, customerDocument } = await req.json()

    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.abacate.com/v1/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ENCODED_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Amount in cents
        "payment_methods": ["pix"],
        "customer": {
          "name": customerName,
          "email": customerEmail,
          "mobile": customerMobile.replace(/\D/g, ''), // Remove non-digits
          "document": customerDocument.replace(/\D/g, ''), // Remove non-digits
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Abacate Pay API Error:", data);
      throw new Error(data.message || "Failed to generate Pix charge.");
    }

    const pixPayment = data.payments.find((p: any) => p.method === 'pix');

    if (!pixPayment) {
        throw new Error("Pix payment details not found in Abacate Pay response.");
    }

    return new Response(JSON.stringify({ 
        br_code: pixPayment.pix.br_code,
        qr_code_url: pixPayment.pix.qr_code_url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})