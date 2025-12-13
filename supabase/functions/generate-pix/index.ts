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
    const { amount, customerName, customerEmail, customerMobile, customerDocument } = payload // Removido externalId da desestruturação

    // Validação de campos obrigatórios (externalId não é mais obrigatório aqui)
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      return new Response(JSON.stringify({ error: "Missing required customer fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRÍTICO: Formatação do amount para centavos (inteiro)
    // Garante que 0.5 se torne 50, 19.90 se torne 1990, etc.
    const amountInCents = Math.round(Number(amount) * 100);
    
    // CRÍTICO: Limpeza de CPF e Telefone (remover máscaras)
    const cleanedTaxId = customerDocument.replace(/[^\d]/g, "");
    const cleanedCellphone = customerMobile.replace(/[^\d]/g, "");

    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const requestBody = {
        amount: amountInCents,
        expiresIn: 3600, // 1 hour expiration (Obrigatório)
        description: "Pagamento do pedido - GYMSTORE",
        customer: {
          name: customerName,
          cellphone: cleanedCellphone,
          email: customerEmail,
          taxId: cleanedTaxId,
        }
    };

    console.log("PAYLOAD ABACATE:", requestBody); // Debug obrigatório

    const apiOptions = {
      method: 'POST',
      headers: {
        // CRÍTICO: Adicionar o prefixo Bearer
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    console.log("STATUS ABACATE:", response.status); // Debug obrigatório
    console.log("RESPOSTA ABACATE:", JSON.stringify(responseData)); // Debug obrigatório

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