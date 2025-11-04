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

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

interface Coords {
  lat: number;
  lon: number;
}

async function getCoordsFromCep(cep: string): Promise<Coords> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Chave GOOGLE_MAPS_API_KEY não configurada.");
  }
  
  const cleanedCep = cep.replace(/\D/g, "");
  if (cleanedCep.length !== 8) {
    throw new Error(`Formato de CEP inválido: ${cep}`);
  }

  // Usando o CEP e o país (BR) para geocodificação
  const address = `${cleanedCep}, Brazil`;
  const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(apiUrl);
  const data = await response.json();

  if (data.status !== 'OK' || data.results.length === 0) {
    console.error(`Google Maps Geocoding Error for CEP ${cep}:`, data);
    throw new Error(`Não foi possível obter as coordenadas para o CEP ${cep}. Status: ${data.status}.`);
  }

  const location = data.results[0].geometry.location;
  const lat = location.lat;
  const lon = location.lng;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error(`Coordenadas inválidas retornadas pelo Google Maps para o CEP ${cep}.`);
  }
  
  console.log(`Coordenadas Google Maps para ${cep}: Lat=${lat}, Lon=${lon}`);

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
      console.error(`ERRO AO BUSCAR COORDENADAS DE ORIGEM: ${e.message}`);
      throw new Error(`Falha ao processar o CEP de origem da loja (${originCep}): ${e.message}`);
    }

    try {
      destinationCoords = await getCoordsFromCep(destinationCep);
    } catch (e) {
      console.error(`ERRO AO BUSCAR COORDENADAS DE DESTINO: ${e.message}`);
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
    console.error("Erro final na função calculate-distance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})