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
    const payload = await req.json()
    const { amount, customerName, customerEmail, customerMobile, customerDocument, externalId } = payload

    // O externalId é necessário para o webhook, mas pode ser um placeholder inicial.
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument || !externalId) {
      return new Response(JSON.stringify({ error: "Missing required customer fields or externalId." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpar CPF/CNPJ e Telefone, mantendo apenas dígitos
    const cleanedDocument = customerDocument.replace(/[^\d]/g, '');
    const cleanedMobile = customerMobile.replace(/[^\d]/g, '');

    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const requestBody = {
        amount: Math.round(amount * 100), // Amount in cents
        expiresIn: 3600, // 1 hour expiration
        description: "Pagamento do pedido - GYMSTORE",
        customer: {
          name: customerName,
          cellphone: cleanedMobile,
          email: customerEmail,
          taxId: cleanedDocument,
        },
        metadata: {
            externalId: externalId // Usamos o ID do pedido pendente como externalId
        }
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

    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Error Response:", responseData);
      const errorMessage = responseData.error || responseData.message || "Failed to generate Pix charge.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id: pixChargeId, brCode, brCodeBase64 } = responseData.data;

    if (!pixChargeId || !brCode || !brCodeBase64) {
        throw new Error("Pix details not found in Abacate Pay response.");
    }

    const qrCodeUrl = `data:image/png;base64,${brCodeBase64}`;

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