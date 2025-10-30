import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PixInformationDialog } from '@/components/checkout/PixInformationDialog';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items } = useCartStore();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  
  // Placeholder for shipping cost logic
  const shippingCost = 0;

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const total = subtotal + shippingCost;

  const handleFinalizeOrder = () => {
    if (paymentMethod === 'pix') {
      setIsPixDialogOpen(true);
    } else {
      // Lógica para outros métodos de pagamento (ex: cartão) iria aqui
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (selectedItems.length === 0 && !isPixDialogOpen) {
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
                onClick={handleFinalizeOrder}
                disabled={!selectedAddressId || !paymentMethod}
              >
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </div>
      </div>
      <PixInformationDialog
        open={isPixDialogOpen}
        onOpenChange={setIsPixDialogOpen}
        totalAmount={total}
        items={selectedItems}
        selectedAddressId={selectedAddressId}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}