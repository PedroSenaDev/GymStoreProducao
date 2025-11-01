import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("A chave da API do Google Maps não está configurada. Por favor, adicione o segredo 'GOOGLE_MAPS_API_KEY' nas configurações do seu projeto Supabase.");
    }

    const { originCep, destinationCep } = await req.json();
    if (!originCep || !destinationCep) {
      throw new Error("CEP de origem e destino são obrigatórios.");
    }

    const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originCep}&destinations=${destinationCep}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0] || data.rows[0].elements[0].status !== 'OK') {
      const googleStatus = data.rows?.[0]?.elements?.[0]?.status;
      if (googleStatus === 'ZERO_RESULTS' || googleStatus === 'NOT_FOUND') {
        throw new Error(`Não foi possível encontrar uma rota entre os CEPs ${originCep} e ${destinationCep}. Verifique se os endereços são válidos.`);
      }
      throw new Error(`Erro ao consultar a API do Google Maps: ${data.error_message || data.status}`);
    }

    const distanceInMeters = data.rows[0].elements[0].distance.value;
    const distanceInKm = distanceInMeters / 1000;

    return new Response(JSON.stringify({ distance: distanceInKm.toFixed(2) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função calculate-google-maps-distance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})