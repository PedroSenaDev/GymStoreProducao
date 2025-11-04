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
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY não está definida no arquivo .env");
}
const stripePromise = loadStripe(stripePublishableKey);

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items, clearNonSelectedItems } = useCartStore();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  
  // Novos estados para o Melhor Envio
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingServiceId, setShippingServiceId] = useState<string | null>(null);
  const [shippingServiceName, setShippingServiceName] = useState<string | null>(null);
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingClientSecret, setIsLoadingClientSecret] = useState(false);

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const total = subtotal + shippingCost;

  const isProfileIncomplete = !profile?.full_name || !profile?.cpf;
  // A verificação de frete agora é se temos um custo > 0 E um serviço selecionado
  const isShippingCalculated = selectedAddressId && shippingCost > 0 && shippingServiceId;
  const isCheckoutDisabled = !isShippingCalculated || !paymentMethod || isProfileIncomplete || isLoadingProfile;

  useEffect(() => {
    const createPaymentIntent = async () => {
      // Nova verificação rigorosa para garantir que todos os dados necessários estejam presentes
      if (
        paymentMethod === 'credit_card' && 
        total > 0 && 
        selectedAddressId && 
        session?.user.id && 
        profile?.full_name && 
        profile?.cpf && 
        session.user.email &&
        shippingServiceId // Requer o ID do serviço de frete
      ) {
        setIsLoadingClientSecret(true);
        setClientSecret(null); // Clear previous secret

        try {
          // CRITICAL STEP: Ensure only selected items are in the DB cart before creating PI
          await clearNonSelectedItems();

          const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              items: selectedItems,
              shippingAddressId: selectedAddressId,
              userId: session.user.id,
              shippingCost,
              // Passando o ID do serviço de frete (Melhor Envio ID)
              shippingServiceId: shippingServiceId, 
              shippingServiceName: shippingServiceName,
              // Adicionando informações do cliente para o Stripe
              customerDetails: {
                name: profile.full_name,
                email: session.user.email,
                phone: profile.phone || '', // Garante que é uma string
                cpf: profile.cpf,
              }
            },
          });
          if (error || data.error) throw new Error(error?.message || data.error);
          setClientSecret(data.clientSecret);
        } catch (err: any) {
          showError(`Erro ao iniciar pagamento: ${err.message}`);
          setPaymentMethod(null); // Reseta o método de pagamento em caso de erro
        } finally {
          setIsLoadingClientSecret(false);
        }
      } else {
        setClientSecret(null);
      }
    };
    createPaymentIntent();
  }, [paymentMethod, total, selectedAddressId, session?.user.id, selectedItems, shippingCost, shippingServiceId, shippingServiceName, clearNonSelectedItems, profile]);

  const handleFinalizeOrder = () => {
    if (isCheckoutDisabled) return;
    if (paymentMethod === 'pix') {
      setIsPixDialogOpen(true);
    }
    // Para cartão, o botão de pagamento está dentro do CheckoutForm
  };

  // Atualiza o estado do frete com o ID e nome do serviço
  const handleShippingChange = (cost: number, serviceId: string | null, serviceName: string | null) => {
    setShippingCost(cost);
    setShippingServiceId(serviceId);
    setShippingServiceName(serviceName);
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
              {!isShippingCalculated && (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione um endereço e uma opção de frete para escolher o método de pagamento.
                  </AlertDescription>
                </Alert>
              )}
              <div className={!isShippingCalculated ? 'pointer-events-none opacity-50' : ''}>
                <PaymentStep selectedPaymentMethod={paymentMethod} onPaymentMethodSelect={setPaymentMethod} />
              </div>
              {isLoadingClientSecret && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {paymentMethod === 'credit_card' && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm />
                </Elements>
              )}
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
      </div>
      <PixInformationDialog
        open={isPixDialogOpen}
        onOpenChange={setIsPixDialogOpen}
        totalAmount={total}
        items={selectedItems}
        selectedAddressId={selectedAddressId}
        paymentMethod={paymentMethod}
        shippingCost={shippingCost}
        // Passando o ID do serviço de frete e o nome
        shippingServiceId={shippingServiceId}
        shippingServiceName={shippingServiceName}
      />
    </div>
  );
}