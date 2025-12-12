import { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PixInformationDialog } from '@/components/checkout/PixInformationDialog';
import { useProfile } from '@/hooks/useProfile';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { CreditCardFormWrapper } from '@/components/checkout/CreditCardFormWrapper';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items, clearNonSelectedItems } = useCartStore();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<{ id: string | number; name: string; } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState<string | number | null>(null);
  const [birthdayDiscount, setBirthdayDiscount] = useState(0);
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(false);

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const discountAmount = (subtotal * birthdayDiscount) / 100;
  const total = subtotal - discountAmount + shippingCost;

  const isProfileIncomplete = !profile?.full_name || !profile?.cpf;
  const isShippingSelected = selectedAddressId && selectedRate;
  const isCheckoutDisabled = !isShippingSelected || !paymentMethod || isProfileIncomplete || isLoadingProfile;

  useEffect(() => {
    const checkBirthdayDiscount = async () => {
      if (session?.user.id) {
        try {
          const { data, error } = await supabase.functions.invoke('apply-birthday-discount', {
            body: { userId: session.user.id },
          });
          if (error) throw error;
          setBirthdayDiscount(data.discountPercentage || 0);
        } catch (err) {
          console.error("Failed to check for birthday discount:", err);
        }
      }
    };
    checkBirthdayDiscount();
  }, [session?.user.id]);

  useEffect(() => {
    const createPaymentIntent = async () => {
      if (paymentMethod === 'credit_card' && total > 0 && isShippingSelected && session?.user.id && profile) {
        setIsLoadingClientSecret(true);
        setClientSecret(null);

        try {
          await clearNonSelectedItems();

          const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              items: selectedItems,
              shippingAddressId: selectedAddressId,
              userId: session.user.id,
              shippingCost,
              shippingRateId: selectedRate.id,
              shippingRateName: selectedRate.name,
              deliveryTime: deliveryTime,
              customerName: profile.full_name,
              customerEmail: session.user.email,
              customerPhone: profile.phone,
              birthdayDiscount: birthdayDiscount, // Passando o desconto
            },
          });
          if (error || data.error) throw new Error(error?.message || data.error);
          setClientSecret(data.clientSecret);
        } catch (err: any) {
          showError(`Erro ao iniciar pagamento: ${err.message}`);
          setPaymentMethod(null);
        } finally {
          setIsLoadingClientSecret(false);
        }
      } else {
        setClientSecret(null);
      }
    };
    createPaymentIntent();
  }, [paymentMethod, total, selectedAddressId, selectedRate, session?.user.id, profile, selectedItems, shippingCost, deliveryTime, clearNonSelectedItems, isShippingSelected, birthdayDiscount]);

  const handleFinalizeOrder = () => {
    if (isCheckoutDisabled) return;
    if (paymentMethod === 'pix') {
      setIsPixDialogOpen(true);
    }
  };

  const handleShippingChange = (cost: number, rateId: string | number, rateName: string, time: string | number) => {
    setShippingCost(cost);
    setSelectedRate(rateId ? { id: rateId, name: rateName } : null);
    setDeliveryTime(time);
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
            <AddressStep 
              selectedAddressId={selectedAddressId} 
              onAddressSelect={setSelectedAddressId}
              onShippingChange={handleShippingChange}
            />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">3. Método de Pagamento</h2>
              {!isShippingSelected && (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione um endereço e calcule o frete para continuar.
                  </AlertDescription>
                </Alert>
              )}
              <div className={!isShippingSelected ? 'pointer-events-none opacity-50' : ''}>
                <PaymentStep selectedPaymentMethod={paymentMethod} onPaymentMethodSelect={setPaymentMethod} />
              </div>
              
              {paymentMethod === 'credit_card' && (
                <CreditCardFormWrapper 
                  clientSecret={clientSecret} 
                  isLoading={isLoadingClientSecret} 
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-1 sticky top-28 space-y-6">
            <h2 className="text-xl font-semibold">Resumo do Pedido</h2>
            <OrderSummary items={selectedItems} shippingCost={shippingCost} discount={birthdayDiscount} />
            {isProfileIncomplete && !isLoadingProfile && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, <a href="/profile/details" className="font-semibold underline">complete seu perfil</a> (nome e CPF) para continuar.
                </AlertDescription>
              </Alert>
            )}
            {paymentMethod !== 'credit_card' && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleFinalizeOrder}
                disabled={isCheckoutDisabled}
              >
                Finalizar Pedido
              </Button>
            )}
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
        shippingRate={selectedRate}
        deliveryTime={deliveryTime}
      />
    </div>
  );
}