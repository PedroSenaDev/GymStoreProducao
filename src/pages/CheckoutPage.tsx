import { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useProfile } from '@/hooks/useProfile';
import { AlertCircle, Loader2, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const { items, clearNonSelectedItems } = useCartStore();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<{ id: string | number; name: string; } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>('pix');
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState<string | number | null>(null);
  const [birthdayDiscount, setBirthdayDiscount] = useState(0);
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Detecção robusta de Safari (incluindo iOS)
  const isSafari = useMemo(() => {
    const ua = navigator.userAgent;
    return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
  }, []);

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  
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

  const handleStartCheckout = async () => {
    if (!session?.user.id || !profile || !session.user.email) {
        showError("Sessão de usuário ou perfil incompleto.");
        return;
    }

    setIsProcessingPayment(true);
    try {
        // Limpa apenas itens que NÃO estão sendo comprados agora
        await clearNonSelectedItems();

        const functionName = paymentMethod === 'pix' ? 'create-abacate-billing' : 'create-checkout-session';
        const body = {
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
        };

        const { data, error } = await supabase.functions.invoke(functionName, { body });
        
        if (error || data.error) throw new Error(error?.message || data.error);

        const url = data.billingUrl || data.sessionUrl;

        if (url) {
            if (isSafari) {
                // No Safari, apenas guardamos a URL para o clique final síncrono
                setPaymentUrl(url);
                setIsProcessingPayment(false);
            } else {
                // Outros navegadores redirecionam direto
                window.location.href = url;
            }
        } else {
            throw new Error("URL de pagamento não gerada.");
        }

    } catch (err: any) {
        showError(`Erro ao preparar checkout: ${err.message}`);
        setIsProcessingPayment(false);
    }
  };

  const handleShippingChange = (cost: number, rateId: string | number, rateName: string, time: string | number) => {
    setShippingCost(cost);
    setSelectedRate(rateId ? { id: rateId, name: rateName } : null);
    setDeliveryTime(time);
    setPaymentUrl(null);
  };

  useEffect(() => {
    setPaymentUrl(null);
  }, [paymentMethod]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // IMPORTANTE: Só redirecionamos se não houver itens E não estivermos no processo de pagamento
  if (selectedItems.length === 0 && !paymentUrl) {
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
                  Complete seu <a href="/profile/details" className="font-bold underline">perfil</a> (Nome, CPF e Telefone) para continuar.
                </AlertDescription>
              </Alert>
            )}

            {paymentUrl ? (
                <div className="space-y-4 p-4 border-2 border-green-200 bg-green-50 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                        <ShieldCheck className="h-5 w-5" />
                        <span>Pronto para pagar!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                        O link seguro foi gerado com sucesso. Clique no botão abaixo para concluir no ambiente de pagamento.
                    </p>
                    
                    {/* FORMULÁRIO NATIVO: O método mais seguro para o Safari aceitar o clique como síncrono */}
                    <form action={paymentUrl} method="GET">
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-md"
                        >
                            Finalizar e Ir ao Pagamento
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </form>
                    
                    <Button variant="ghost" size="sm" className="w-full text-xs text-green-800" onClick={() => setPaymentUrl(null)}>
                        Voltar e alterar algo
                    </Button>
                </div>
            ) : (
                <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleStartCheckout}
                    disabled={isCheckoutDisabled || isProcessingPayment}
                >
                    {isProcessingPayment ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        paymentMethod === 'pix' ? 'Gerar Pagamento Pix' : 'Ir para Pagamento com Cartão'
                    )}
                </Button>
            )}
            
            {isSafari && !paymentUrl && (
                <p className="text-[11px] text-center text-muted-foreground mt-3 leading-tight px-4">
                    Pelo Safari, o pagamento será concluído em uma etapa adicional para garantir sua segurança e privacidade.
                </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}