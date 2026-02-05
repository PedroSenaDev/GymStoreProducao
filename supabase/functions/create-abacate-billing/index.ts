import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY")
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const APP_BASE_URL = Deno.env.get('APP_BASE_URL')

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
  
  const baseAppUrl = APP_BASE_URL || 'https://gymstoremoc.vercel.app';

  try {
    const { 
      items, shippingCost, userId, shippingAddressId, shippingRateId, shippingRateName, deliveryTime,
      customerName, customerEmail, customerMobile, customerDocument, birthdayDiscount
    } = await req.json();

    if (!items || items.length === 0 || !userId || !shippingAddressId || !customerName || !customerEmail || !customerMobile || !customerDocument) {
      throw new Error("Informações essenciais do pedido ou cliente incompletas.");
    }

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
      const price = Number(productDetails?.price) || 0; 
      subtotal += (price * item.quantity);

      const priceInCents = Math.round(price * 100);

      return {
        externalId: item.id,
        name: productDetails?.name || item.name,
        description: `Tam: ${item.selectedSize || 'N/A'}, Cor: ${item.selectedColor?.name || 'N/A'}`,
        quantity: item.quantity,
        price: priceInCents,
      };
    });

    const discountPercentage = Number(birthdayDiscount || 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    
    if (discountAmount > 0) {
        abacateProducts.push({
            externalId: 'birthday-discount',
            name: `Desconto de Aniversário (${discountPercentage}%)`,
            description: 'Desconto aplicado no checkout',
            quantity: 1,
            price: -Math.round(discountAmount * 100),
        });
    }

    if (shippingCost > 0) {
        abacateProducts.push({
            externalId: 'shipping-cost',
            name: `Frete: ${shippingRateName}`,
            description: `Prazo: ${deliveryTime} dias`,
            quantity: 1,
            price: Math.round(shippingCost * 100),
        });
    }

    const { data: address, error: addressError } = await supabaseAdmin
        .from('addresses')
        .select('*')
        .eq('id', shippingAddressId)
        .single();
    
    if (addressError) throw new Error(`Endereço de entrega não encontrado.`);

    const totalAmount = subtotal - discountAmount + shippingCost;

    // Payload de itens simplificado para o Webhook processar o estoque
    const itemsPayload = items.map((item: any) => {
        const productDetails = productMap.get(item.id);
        return {
            product_id: item.id,
            quantity: item.quantity,
            price: Number(productDetails?.price) || 0,
            selected_size: item.selectedSize,
            selected_color: item.selectedColor, // Objeto completo {code, name}
        };
    });

    const metadata = {
        userId: userId,
        shippingAddressId: shippingAddressId,
        shippingCost: shippingCost.toFixed(2),
        shippingRateId: shippingRateId.toString(),
        shippingRateName: shippingRateName,
        deliveryTime: deliveryTime?.toString() || 'N/A',
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: 'pix',
        shipping_street: address.street,
        shipping_number: address.number,
        shipping_complement: address.complement,
        shipping_neighborhood: address.neighborhood,
        shipping_city: address.city,
        shipping_state: address.state,
        shipping_zip_code: address.zip_code,
        orderItems: JSON.stringify(itemsPayload),
    };

    const response = await fetch('https://api.abacatepay.com/v1/billing/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ABACATE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            frequency: "ONE_TIME",
            methods: ["PIX"],
            products: abacateProducts,
            returnUrl: `${baseAppUrl}/checkout`,
            completionUrl: `${baseAppUrl}/payment-status?abacate_pay_status=pending`, 
            customer: {
                name: customerName,
                cellphone: customerMobile.replace(/[^\d]/g, ""),
                email: customerEmail,
                taxId: customerDocument.replace(/[^\d]/g, ""),
            },
            metadata: metadata
        })
    });
    const responseData = await response.json();

    if (!response.ok) throw new Error(responseData.message || "Erro na Abacate Pay.");

    return new Response(JSON.stringify({ billingUrl: responseData.data.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})