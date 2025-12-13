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

    // 1. Validação e Limpeza dos dados
    if (!amount || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      console.error("Missing required customer fields in payload.");
      return new Response(JSON.stringify({ error: "Missing required customer fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpar CPF/CNPJ e Telefone, mantendo apenas dígitos
    const cleanedDocument = customerDocument.replace(/[^\d]/g, '');
    const cleanedMobile = customerMobile.replace(/[^\d]/g, '');

    if (cleanedDocument.length < 11 || cleanedMobile.length < 10) {
        return new Response(JSON.stringify({ error: "CPF/CNPJ ou Telefone inválido após limpeza." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 2. Preparar o request para a Abacate Pay API
    const apiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const requestBody = {
        amount: Math.round(amount * 100), // Amount in cents
        expiresIn: 3600, // 1 hour expiration
        description: "Pagamento do pedido - GYMSTORE",
        customer: {
          name: customerName,
          cellphone: cleanedMobile, // Enviando APENAS dígitos
          email: customerEmail,
          taxId: cleanedDocument, // Enviando APENAS dígitos
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

    // 3. Chamar a Abacate Pay API
    const response = await fetch(apiUrl, apiOptions);
    const responseData = await response.json();

    // 4. Tratar erros da API
    if (!response.ok || responseData.error) {
      console.error("Abacate Pay API Error Response:", responseData);
      const errorMessage = responseData.error?.message || responseData.message || "Failed to generate Pix charge.";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Extrair e retornar dados de sucesso
    const { id: pixChargeId, brCode, brCodeBase64 } = responseData.data;

    if (!pixChargeId || !brCode || !brCodeBase64) {
        console.error("Pix details missing in successful Abacate Pay response:", responseData);
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