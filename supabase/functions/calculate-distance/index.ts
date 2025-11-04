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
  const cleanedCep = cep.replace(/\D/g, "");
  if (cleanedCep.length !== 8) {
    throw new Error(`Formato de CEP inválido: ${cep}`);
  }

  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanedCep}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`CEP ${cep} não encontrado na base de dados de geolocalização.`);
    }
    throw new Error(`Falha ao buscar informações para o CEP ${cep}.`);
  }

  const data = await response.json();

  if (!data.location || !data.location.coordinates) {
    console.error(`API de CEP retornou dados sem coordenadas para ${cep}:`, data);
    throw new Error(`Não foi possível obter as coordenadas para o CEP ${cep}. Este CEP pode não ter geolocalização cadastrada.`);
  }

  const lat = parseFloat(data.location.coordinates.latitude);
  const lon = parseFloat(data.location.coordinates.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    console.error(`Coordenadas inválidas (NaN) para o CEP ${cep}. Dados brutos:`, data.location.coordinates);
    throw new Error(`Coordenadas inválidas para o CEP ${cep}.`);
  }
  
  console.log(`Coordenadas para ${cep}: Lat=${lat}, Lon=${lon}`);

  return { lat, lon };
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
    
    console.log(`Distância final calculada: ${distance.toFixed(2)} km`);

    return new Response(JSON.stringify({ distance: distance.toFixed(2) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Garante que o erro seja retornado com status 400 e a mensagem no corpo
    console.error("Erro na função calculate-distance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})