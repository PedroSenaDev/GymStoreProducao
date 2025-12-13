import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

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
    const { 
      items, shippingCost, userId, shippingAddressId, shippingRate, deliveryTime,
      customerProfile, customerEmail, birthdayDiscount, totalAmount
    } = await req.json();

    if (!userId || !shippingAddressId || !shippingRate || !customerProfile || items.length === 0) {
      throw new Error("Informações essenciais do pedido ou cliente incompletas.");
    }

    // --- 1. Criar o Pedido Pendente no Supabase (Snapshot) ---
    
    // Buscar o endereço completo para fazer o snapshot
    const { data: address, error: addressError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', shippingAddressId)
      .single();
    if (addressError) throw new Error(`Endereço de entrega não encontrado: ${addressError.message}`);

    // Criar o Pedido (Status 'pending')
    const { data: orderData, error: orderError } = await supabaseAdmin.from('orders').insert({
      user_id: userId,
      total_amount: totalAmount,
      status: 'pending',
      shipping_address_id: shippingAddressId,
      payment_method: 'pix',
      shipping_cost: shippingCost,
      shipping_service_id: shippingRate.id.toString(),
      shipping_service_name: shippingRate.name,
      delivery_time: deliveryTime?.toString(),
      // Snapshot do endereço
      shipping_street: address.street,
      shipping_number: address.number,
      shipping_complement: address.complement,
      shipping_neighborhood: address.neighborhood,
      shipping_city: address.city,
      shipping_state: address.state,
      shipping_zip_code: address.zip_code,
    }).select('id').single();

    if (orderError) throw orderError;
    const orderId = orderData.id;

    // Criar os Itens do Pedido (Snapshot)
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      selected_size: item.selectedSize,
      selected_color: item.selectedColor,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) {
      // Se falhar, tentamos reverter o pedido
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      throw itemsError;
    }

    // --- 2. Formatar dados para Abacate Pay ---
    
    const subtotalBeforeDiscount = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const discountAmount = (subtotalBeforeDiscount * birthdayDiscount) / 100;
    
    const productsPayload = items.map((item: any) => ({
        externalId: item.id,
        name: item.name,
        description: `Tamanho: ${item.selectedSize || 'N/A'}, Cor: ${item.selectedColor?.name || 'N/A'}`,
        quantity: item.quantity,
        // Preço em centavos
        price: Math.round(item.price * 100), 
    }));

    // Adicionar desconto como item negativo
    if (discountAmount > 0) {
        productsPayload.push({
            externalId: 'DISCOUNT',
            name: `Desconto de Aniversário (${birthdayDiscount}%)`,
            description: 'Desconto aplicado ao subtotal.',
            quantity: 1,
            price: -Math.round(discountAmount * 100), // Valor negativo em centavos
        });
    }

    // Adicionar frete como item
    if (shippingCost > 0) {
        productsPayload.push({
            externalId: 'SHIPPING',
            name: `Frete: ${shippingRate.name}`,
            description: `Prazo: ${deliveryTime} dias`,
            quantity: 1,
            price: Math.round(shippingCost * 100),
        });
    }

    // Limpeza de CPF e Telefone
    const cleanedTaxId = customerProfile.cpf.replace(/[^\d]/g, "");
    const cleanedCellphone = customerProfile.phone.replace(/[^\d]/g, "");
    
    const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://gymstoremoc.vercel.app';

    const billingData = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: productsPayload,
      returnUrl: `${siteUrl}/checkout`,
      completionUrl: `${siteUrl}/payment-status?order_id=${orderId}`,
      customer: {
        name: customerProfile.full_name,
        cellphone: cleanedCellphone,
        email: customerEmail,
        taxId: cleanedTaxId,
      },
      metadata: {
        orderId: orderId, // Passamos o ID do pedido para o webhook
        userId: userId,
      }
    };

    // --- 3. Chamar a API da Abacate Pay ---
    const response = await fetch('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billingData),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      // Se a criação da cobrança falhar, reverter o pedido pendente
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      console.error("Abacate Pay API Error:", responseData);
      throw new Error(responseData.error || responseData.message || "Falha ao criar cobrança Pix.");
    }

    const sessionUrl = responseData.data.url;

    return new Response(JSON.stringify({ sessionUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na função create-abacate-billing:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})