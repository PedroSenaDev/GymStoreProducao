import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function getCoordsFromCep(cep: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error(`Falha ao buscar o CEP ${cep}`);
  const data = await response.json();
  if (data.erro) throw new Error(`CEP ${cep} não encontrado.`);
  
  const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cep}&country=brasil&format=json&limit=1`);
  if (!geoResponse.ok) throw new Error(`Falha ao geolocalizar o CEP ${cep}`);
  const geoData = await geoResponse.json();
  if (geoData.length === 0) throw new Error(`Não foi possível encontrar coordenadas para o CEP ${cep}`);

  return {
    lat: parseFloat(geoData[0].lat),
    lon: parseFloat(geoData[0].lon),
  };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em km
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { destinationCep } = await req.json();
    if (!destinationCep) {
      throw new Error("CEP de destino é obrigatório.");
    }

    // Fetch origin CEP from the database
    const { data: cepSetting, error: cepError } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'store_cep')
      .single();

    if (cepError || !cepSetting || !cepSetting.value) {
      throw new Error("CEP de origem da loja não está configurado. Por favor, adicione-o no painel de Configurar Frete.");
    }
    const originCep = cepSetting.value;

    let originCoords, destinationCoords;

    try {
      originCoords = await getCoordsFromCep(originCep);
    } catch (e) {
      throw new Error(`Falha ao processar o CEP de origem da loja (${originCep}): ${e.message}`);
    }

    try {
      destinationCoords = await getCoordsFromCep(destinationCep);
    } catch (e) {
      throw new Error(`Falha ao processar o CEP de destino (${destinationCep}): ${e.message}`);
    }

    const distance = haversineDistance(
      originCoords.lat,
      originCoords.lon,
      destinationCoords.lat,
      destinationCoords.lon
    );

    return new Response(JSON.stringify({ distance: distance.toFixed(2) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função calculate-distance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})