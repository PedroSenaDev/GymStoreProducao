import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PixInformationDialog } from '@/components/checkout/PixInformationDialog';
import { useProfile } from '@/hooks/useProfile';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items } = useCartStore();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingDistance, setShippingDistance] = useState(0);
  const [shippingZoneId, setShippingZoneId] = useState<string | null>(null);

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const total = subtotal + shippingCost;

  const isProfileIncomplete = !profile?.full_name || !profile?.cpf;
  const isCheckoutDisabled = !selectedAddressId || !paymentMethod || isProfileIncomplete || isLoadingProfile || shippingCost <= 0;

  const handleFinalizeOrder = () => {
    if (isCheckoutDisabled) return;
    if (paymentMethod === 'pix') {
      setIsPixDialogOpen(true);
    }
  };

  const handleShippingChange = (cost: number, distance: number, zoneId: string | null) => {
    setShippingCost(cost);
    setShippingDistance(distance);
    setShippingZoneId(zoneId);
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
              <h2 className="text-xl font-semibold">1. Endereço e Frete</h2>
              <AddressStep 
                selectedAddressId={selectedAddressId} 
                onAddressSelect={setSelectedAddressId}
                onShippingChange={handleShippingChange}
              />
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
              {isProfileIncomplete && !isLoadingProfile && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Por favor, <a href="/profile/details" className="font-semibold underline">complete seu perfil</a> (nome e CPF) para continuar.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                size="lg"
                className="w-full"
                onClick={handleFinalizeOrder}
                disabled={isCheckoutDisabled}
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
        shippingCost={shippingCost}
        shippingDistance={shippingDistance}
        shippingZoneId={shippingZoneId}
      />
    </div>
  );
}