import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  if (!ABACATE_API_KEY) {
    return new Response(JSON.stringify({
      error: "Abacate Pay API key not configured."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
    });
  }

  try {
    const payload = await req.json()
    const {
      amount,
      customerName,
      customerEmail,
      customerMobile,
      customerDocument
    } = payload

    // Validação de campos obrigatórios
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      console.error("Missing required customer fields in payload:", payload);
      return new Response(JSON.stringify({
        error: "Missing required customer fields."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
      });
    }

    // Formatação do amount para centavos (inteiro)
    const amountInCents = Math.round(Number(amount) * 100);

    // Limpeza de CPF e Telefone (remover máscaras)
    const cleanedTaxId = customerDocument.replace(/[^\d]/g, "");
    const cleanedCellphone = customerMobile.replace(/[^\d]/g, "");

    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const requestBody = {
      amount: amountInCents,
      expiresIn: 3600, // 1 hour expiration
      description: "Pagamento do pedido - GYMSTORE",
      customer: {
        name: customerName,
        cellphone: cleanedCellphone,
        email: customerEmail,
        taxId: cleanedTaxId,
      }
    };
    
    console.log("Request Body sent to Abacate Pay:", requestBody);

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
    
    console.log("Response received from Abacate Pay:", responseData);

    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Error Response:", responseData);
      const errorMessage = responseData.error || responseData.message || "Failed to generate Pix charge.";
      return new Response(JSON.stringify({
        error: errorMessage
      }), {
        status: response.status || 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
      });
    }

    const {
      id, // Renomeado de pixChargeId para id
      brCode,
      brCodeBase64,
      expiresAt
    } = responseData.data;

    if (!id || !brCode || !brCodeBase64) {
      throw new Error("Pix details not found in Abacate Pay response.");
    }

    // O frontend espera o QR Code como URL base64
    const qrCodeUrl = `data:image/png;base64,${brCodeBase64}`;

    return new Response(JSON.stringify({
      id: id, // Usando 'id' para o ID da cobrança
      brCode: brCode,
      qrCodeUrl: qrCodeUrl, // Usando 'qrCodeUrl' para a URL base64
      expiresAt: expiresAt
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
    });
  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
    });
  }
})