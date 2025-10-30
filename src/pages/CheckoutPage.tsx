import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const { items, removeSelectedItems } = useCartStore();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  
  // Placeholder for shipping cost logic
  const shippingCost = 0;

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const total = subtotal + shippingCost;

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error("Usuário não autenticado.");
      if (!selectedAddressId) throw new Error("Por favor, selecione um endereço de entrega.");
      if (!paymentMethod) throw new Error("Por favor, selecione um método de pagamento.");
      if (selectedItems.length === 0) throw new Error("Seu carrinho está vazio.");

      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          total_amount: total,
          status: 'pending',
          shipping_address_id: selectedAddressId,
          payment_method: paymentMethod,
          shipping_cost: shippingCost,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      const orderId = orderData.id;

      // 2. Create the order items
      const orderItems = selectedItems.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        // Attempt to delete the created order if items fail to be inserted
        await supabase.from('orders').delete().eq('id', orderId);
        throw itemsError;
      }

      // 3. Clear the cart
      await removeSelectedItems();
    },
    onSuccess: () => {
      showSuccess("Pedido realizado com sucesso!");
      navigate('/profile/orders');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (selectedItems.length === 0) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="container py-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-10 text-center">Finalizar Compra</h1>
        
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start">
          <div className="space-y-8 lg:col-span-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">1. Endereço de Entrega</h2>
              <AddressStep selectedAddressId={selectedAddressId} onAddressSelect={setSelectedAddressId} />
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">2. Método de Pagamento</h2>
              <PaymentStep selectedPaymentMethod={paymentMethod} onPaymentMethodSelect={setPaymentMethod} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Resumo do Pedido</h2>
                <OrderSummary items={selectedItems} shippingCost={shippingCost} />
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => placeOrder()}
                disabled={!selectedAddressId || !paymentMethod || isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}