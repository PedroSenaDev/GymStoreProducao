import { useMemo, useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useProfile } from '@/hooks/useProfile';
import { AlertCircle, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items, clearNonSelectedItems, removeSelectedItems } = useCartStore();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<{ id: string | number; name: string; } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>('pix');
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState<string | number | null>(null);
  const [birthdayDiscount, setBirthdayDiscount] = useState(0);
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Detecta se o navegador é Safari (incluindo iOS)
  const isSafari = useMemo(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const discountAmount = (subtotal * birthdayDiscount) / 100;
  const total = subtotal - discountAmount + shippingCost;

  const isProfileIncomplete = !profile?.full_name || !profile?.cpf || !profile?.phone;
  const isShippingSelected = selectedAddressId && selectedRate;
  const isCheckoutDisabled = !isShippingSelected || isProfileIncomplete || isLoadingProfile || !paymentMethod;

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

  const handleAbacatePayCheckout = async () => {
    if (!session?.user.id || !profile || !session.user.email) {
        showError("Sessão de usuário ou perfil incompleto.");
        return;
    }

    setIsProcessingPayment(true);
    try {
        await clearNonSelectedItems();

        const { data, error } = await supabase.functions.invoke('create-abacate-billing', {
            body: {
                items: selectedItems,
                shippingAddressId: selectedAddressId,
                userId: session.user.id,
                shippingCost,
                shippingRateId: selectedRate!.id,
                shippingRateName: selectedRate!.name,
                deliveryTime: deliveryTime,
                birthdayDiscount: birthdayDiscount,
                customerName: profile.full_name,
                customerEmail: session.user.email,
                customerMobile: profile.phone,
                customerDocument: profile.cpf,
            },
        });
        
        if (error || data.error) throw new Error(error?.message || data.error);

        if (data.billingUrl) {
            removeSelectedItems();
            
            if (isSafari) {
                // Se for Safari, salvamos a URL para o segundo clique síncrono
                setPaymentUrl(data.billingUrl);
                setIsProcessingPayment(false);
            } else {
                // Outros navegadores seguem o fluxo automático (abre em nova aba conforme solicitado anteriormente)
                window.open(data.billingUrl, '_blank');
                navigate('/payment-status?abacate_pay_status=pending');
            }
        } else {
            throw new Error("URL de cobrança não recebida.");
        }

    } catch (err: any) {
        showError(`Erro ao iniciar pagamento: ${err.message}`);
        setIsProcessingPayment(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!session?.user.id || !profile) {
        showError("Sessão de usuário ou perfil incompleto.");
        return;
    }
    
    setIsProcessingPayment(true);
    try {
        await clearNonSelectedItems();

        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: {
                items: selectedItems,
                shippingAddressId: selectedAddressId,
                userId: session.user.id,
                shippingCost,
                shippingRateId: selectedRate!.id,
                shippingRateName: selectedRate!.name,
                deliveryTime: deliveryTime,
                customerEmail: session.user.email,
                birthdayDiscount: birthdayDiscount,
            },
        });
        
        if (error || data.error) throw new Error(error?.message || data.error);

        if (data.sessionUrl) {
            removeSelectedItems();
            
            if (isSafari) {
                // Se for Safari, salvamos a URL para o segundo clique síncrono
                setPaymentUrl(data.sessionUrl);
                setIsProcessingPayment(false);
            } else {
                // Fluxo automático para outros navegadores
                window.open(data.sessionUrl, '_blank');
            }
        } else {
            throw new Error("URL de sessão não recebida.");
        }

    } catch (err: any) {
        showError(`Erro ao iniciar pagamento: ${err.message}`);
        setIsProcessingPayment(false);
    }
  };

  const handleFinalizeOrder = () => {
    if (isCheckoutDisabled) return;

    if (paymentMethod === 'pix') {
        handleAbacatePayCheckout();
    } else if (paymentMethod === 'credit_card') {
        handleStripeCheckout();
    }
  };

  // Função síncrona para o segundo clique no Safari
  const handleSafariRedirect = useCallback(() => {
    if (paymentUrl) {
      // Navegação full-page é mais confiável no Safari do que window.open
      window.location.assign(paymentUrl);
      
      // Se for PIX, avisamos que ao voltar o status estará pendente
      if (paymentMethod === 'pix') {
          // Nota: O navigate aqui pode não completar antes da página descarregar, 
          // mas o returnUrl do gateway trará o usuário de volta.
      }
    }
  }, [paymentUrl, paymentMethod]);

  const handleShippingChange = (cost: number, rateId: string | number, rateName: string, time: string | number) => {
    setShippingCost(cost);
    setSelectedRate(rateId ? { id: rateId, name: rateName } : null);
    setDeliveryTime(time);
    // Limpa a URL de pagamento se o frete mudar para forçar uma nova geração
    setPaymentUrl(null);
  };

  // Resetar URL de pagamento se o método mudar
  useEffect(() => {
    setPaymentUrl(null);
  }, [paymentMethod]);

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
            <AddressStep 
              selectedAddressId={selectedAddressId} 
              onAddressSelect={setSelectedAddressId}
              onShippingChange={handleShippingChange}
            />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">2. Método de Pagamento</h2>
              {!isShippingSelected && (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione um endereço e calcule o frete para continuar.
                  </AlertDescription>
                </Alert>
              )}
              <div className={!isShippingSelected ? 'pointer-events-none opacity-50' : ''}>
                <PaymentStep selectedPaymentMethod={paymentMethod} onPaymentMethodSelect={(m) => { setPaymentMethod(m); setPaymentUrl(null); }} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 sticky top-28 space-y-6">
            <h2 className="text-xl font-semibold">Resumo do Pedido</h2>
            <OrderSummary items={selectedItems} shippingCost={shippingCost} discount={birthdayDiscount} />
            
            {isProfileIncomplete && !isLoadingProfile && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, <a href="/profile/details" className="font-semibold underline">complete seu perfil</a> (nome, CPF e telefone) para continuar.
                </AlertDescription>
              </Alert>
            )}

            {paymentUrl ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <Alert className="border-primary bg-primary/5">
                        <ExternalLink className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-primary font-medium">
                            Seu pedido foi preparado! Clique abaixo para ir ao ambiente de pagamento seguro.
                        </AlertDescription>
                    </Alert>
                    <Button
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                        onClick={handleSafariRedirect}
                    >
                        Ir para o Pagamento
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setPaymentUrl(null)}>
                        Alterar algo no pedido
                    </Button>
                </div>
            ) : (
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleFinalizeOrder}
                    disabled={isCheckoutDisabled || isProcessingPayment}
                >
                    {isProcessingPayment ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {paymentMethod === 'pix' ? 'Finalizar e Pagar com Pix' : 'Finalizar e Pagar com Cartão'}
                </Button>
            )}
            
            {isSafari && !paymentUrl && (
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Navegador Safari detectado. O pagamento será aberto em uma nova etapa para sua segurança.
                </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}