import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const supabaseAdmin = createClient(
  SUPABASE_URL ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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
      items, shippingCost, userId, shippingAddressId, shippingRateId, shippingRateName, deliveryTime,
      customerName, customerEmail, customerMobile, customerDocument, birthdayDiscount
    } = await req.json();

    if (!items || items.length === 0 || !userId || !shippingAddressId || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      throw new Error("Informações essenciais do pedido ou cliente incompletas.");
    }

    // 1. Recalcular o subtotal dos produtos por segurança e montar line items
    const productIds = items.map((item: any) => item.id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price, name, description, image_urls, colors')
      .in('id', productIds);
    if (productsError) throw productsError;

    const productMap = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    
    const abacateProducts = items.map((item: any) => {
      const productDetails = productMap.get(item.id);
      const price = productDetails?.price || 0;
      subtotal += (price * item.quantity);

      // Price must be in cents (R$ 1.00 = 100)
      const priceInCents = Math.round(price * 100);

      return {
        externalId: item.id,
        name: productDetails?.name || item.name,
        description: `Tamanho: ${item.selectedSize || 'N/A'}, Cor: ${item.selectedColor?.name || 'N/A'}`,
        quantity: item.quantity,
        price: priceInCents,
      };
    });

    // 2. Aplicar Desconto de Aniversário (como um item de linha negativo)
    const discountPercentage = Number(birthdayDiscount || 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    
    if (discountAmount > 0) {
        abacateProducts.push({
            externalId: 'birthday-discount',
            name: `Desconto de Aniversário (${discountPercentage}%)`,
            description: 'Desconto aplicado no checkout',
            quantity: 1,
            price: -Math.round(discountAmount * 100), // Valor negativo em centavos
        });
    }

    // 3. Adicionar Custo de Envio (como um item de linha)
    if (shippingCost > 0) {
        abacateProducts.push({
            externalId: 'shipping-cost',
            name: `Frete: ${shippingRateName}`,
            description: `Prazo: ${deliveryTime} dias`,
            quantity: 1,
            price: Math.round(shippingCost * 100), // Valor em centavos
        });
    }

    // 4. Criar o Pedido Pendente no Supabase (Snapshot)
    // Buscar o endereço completo para fazer o snapshot
    const { data: address, error: addressError } = await supabaseAdmin
        .from('addresses')
        .select('*')
        .eq('id', shippingAddressId)
        .single();
    
    if (addressError) throw new Error(`Endereço de entrega não encontrado: ${addressError.message}`);

    const totalAmount = subtotal - discountAmount + shippingCost;

    const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: userId,
            total_amount: totalAmount,
            status: 'pending',
            shipping_address_id: shippingAddressId,
            payment_method: 'abacate_pay_hosted', // Novo método
            shipping_cost: shippingCost,
            shipping_service_id: shippingRateId.toString(),
            shipping_service_name: shippingRateName,
            delivery_time: deliveryTime?.toString() || 'N/A',
            // Snapshot do endereço
            shipping_street: address.street,
            shipping_number: address.number,
            shipping_complement: address.complement,
            shipping_neighborhood: address.neighborhood,
            shipping_city: address.city,
            shipping_state: address.state,
            shipping_zip_code: address.zip_code,
        })
        .select('id')
        .single();
    
    if (orderError) throw orderError;
    const orderId = orderData.id;

    // 5. Criar os Itens do Pedido (Snapshot)
    const orderItemsPayload = items.map((item: any) => {
        const productDetails = productMap.get(item.id);
        const productColors = productDetails?.colors || [];
        const selectedColorObject = productColors.find((c: any) => c.code === item.selectedColor?.code);

        return {
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            price: productDetails?.price || 0,
            selected_size: item.selectedSize,
            selected_color: selectedColorObject,
        };
    });

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload);
    if (itemsError) {
        // Se falhar, tentamos reverter o pedido
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        throw itemsError;
    }

    // 6. Chamar a API Abacate Pay
    const baseAppUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'https://gymstoremoc.vercel.app';

    const requestBody = {
        frequency: "ONE_TIME",
        methods: ["PIX"], // Usando PIX conforme exemplo. Se precisar de cartão, o usuário deve atualizar.
        products: abacateProducts,
        returnUrl: `${baseAppUrl}/checkout`,
        completionUrl: `${baseAppUrl}/payment-status?abacate_order_id=${orderId}`, // Usamos o ID do pedido como externalId
        customer: {
            name: customerName,
            cellphone: customerMobile.replace(/[^\d]/g, ""),
            email: customerEmail,
            taxId: customerDocument.replace(/[^\d]/g, ""),
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

    const response = await fetch('https://api.abacatepay.com/v1/billing/create', apiOptions);
    const responseData = await response.json();

    if (!response.ok || responseData.error) {
        console.error("Abacate Pay Billing API Error Response:", responseData);
        // Se falhar, tentamos reverter o pedido
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        throw new Error(responseData.error || responseData.message || "Falha ao criar cobrança na Abacate Pay.");
    }

    // 7. Retornar o URL de redirecionamento
    return new Response(JSON.stringify({ 
        billingUrl: responseData.data.url,
        orderId: orderId
    }), {
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
