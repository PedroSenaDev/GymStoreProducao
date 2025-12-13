import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useCartStore } from '@/store/cartStore'; // Import useCartStore

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const { clearCart } = useCartStore(); // Get clearCart function

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const abacateOrderId = searchParams.get('abacate_order_id');

    if (!sessionId && !abacateOrderId) {
      if (searchParams.get('error')) {
        showError("Ocorreu um erro durante o pagamento. Tente novamente.");
        setStatus('error');
      } else {
        navigate('/');
      }
      return;
    }

    // --- Stripe Flow ---
    const checkStripeSessionStatus = async (sessionId: string) => {
      setMessage('Aguarde enquanto confirmamos seu pagamento via Stripe...');
      
      try {
        // 1. Verificar o status da sessão na Stripe (via Edge Function)
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('retrieve-checkout-session', {
          body: { sessionId },
        });

        if (sessionError || sessionData.error) {
          throw new Error(sessionError?.message || sessionData.error);
        }

        const paymentStatus = sessionData.status; // 'paid', 'unpaid', 'no_payment_required'
        const paymentIntentId = sessionData.paymentIntentId;

        if (paymentStatus === 'paid') {
          // 2. Se pago, verificar se o pedido já foi criado pelo webhook
          const { data: orderData, error: orderFetchError } = await supabase
            .from('orders')
            .select('id, status')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .maybeSingle();

          if (orderFetchError) throw orderFetchError;

          if (orderData) {
            setMessage('Pagamento aprovado com sucesso! Seu pedido está sendo processado.');
            setStatus('success');
            setOrderId(orderData.id);
            // O webhook deve ter limpado o carrinho, mas limpamos o estado local.
            clearCart(); 
          } else {
            // Polling para esperar o webhook
            setMessage('Pagamento aprovado. Aguardando confirmação final do pedido...');
            
            const pollOrder = setInterval(async () => {
                const { data: polledOrder } = await supabase
                    .from('orders')
                    .select('id, status')
                    .eq('stripe_payment_intent_id', paymentIntentId)
                    .maybeSingle();
                
                if (polledOrder) {
                    clearInterval(pollOrder);
                    setMessage('Pedido confirmado e processado!');
                    setStatus('success');
                    setOrderId(polledOrder.id);
                    clearCart();
                }
            }, 2000); 
            
            return () => clearInterval(pollOrder);
          }
        } else if (paymentStatus === 'unpaid') {
          setMessage('Falha no pagamento. Por favor, tente outro método.');
          setStatus('error');
        } else {
          setMessage('Status de pagamento desconhecido ou pendente.');
          setStatus('error');
        }

      } catch (error: any) {
        console.error("Erro ao verificar status do pagamento Stripe:", error);
        showError(error.message || 'Ocorreu um erro inesperado ao verificar o status do pagamento.');
        setMessage('Ocorreu um erro ao verificar o status do pagamento.');
        setStatus('error');
      }
    };

    // --- Abacate Pay Hosted Checkout Flow ---
    const checkAbacatePayStatus = async (orderId: string) => {
        setMessage('Aguarde enquanto verificamos o status do seu pedido...');
        setOrderId(orderId);

        try {
            // 1. Buscar o status do pedido no Supabase
            const { data: orderData, error: orderFetchError } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single();

            if (orderFetchError) throw orderFetchError;

            const orderStatus = orderData.status;

            if (orderStatus === 'processing') {
                // O webhook da Abacate Pay funcionou e atualizou o status
                setMessage('Pagamento Pix aprovado! Seu pedido está sendo processado.');
                setStatus('success');
                clearCart(); // Clear local cart (already cleared selected items in checkout, but ensures full cleanup)
            } else if (orderStatus === 'pending') {
                // O pagamento ainda está pendente de confirmação (comum para Pix)
                setMessage('Seu pedido foi registrado e está aguardando a confirmação do pagamento Pix. Isso pode levar alguns minutos.');
                setStatus('pending');
                
                // Iniciar polling para verificar se o webhook atualiza o status
                const pollOrder = setInterval(async () => {
                    const { data: polledOrder } = await supabase
                        .from('orders')
                        .select('status')
                        .eq('id', orderId)
                        .single();
                    
                    if (polledOrder?.status === 'processing') {
                        clearInterval(pollOrder);
                        setMessage('Pagamento Pix aprovado! Seu pedido está sendo processado.');
                        setStatus('success');
                        clearCart();
                    }
                }, 5000); 

                return () => clearInterval(pollOrder);

            } else {
                // Status inesperado (e.g., cancelled)
                setMessage('O status do seu pedido é inesperado. Por favor, verifique a página de pedidos.');
                setStatus('error');
            }

        } catch (error: any) {
            console.error("Erro ao verificar status do pagamento Abacate Pay:", error);
            showError('Ocorreu um erro ao verificar o status do pedido. Verifique a página de pedidos.');
            setMessage('Ocorreu um erro ao verificar o status do pedido.');
            setStatus('error');
        }
    };

    if (sessionId) {
        checkStripeSessionStatus(sessionId);
    } else if (abacateOrderId) {
        checkAbacatePayStatus(abacateOrderId);
    }

  }, [searchParams, navigate, clearCart]);

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green-500" />
            <CardTitle>Pagamento Aprovado!</CardTitle>
            <CardDescription>{message}</CardDescription>
            <Button asChild className="mt-6">
              <Link to="/profile/orders">Ver Meus Pedidos</Link>
            </Button>
          </>
        );
      case 'pending':
        return (
            <>
              <Clock className="h-16 w-16 text-yellow-500" />
              <CardTitle>Pagamento Pendente</CardTitle>
              <CardDescription>{message}</CardDescription>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/profile/orders">Acompanhar Pedido</Link>
              </Button>
            </>
          );
      case 'error':
        return (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <CardTitle>Falha no Pagamento</CardTitle>
            <CardDescription>{message}</CardDescription>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/checkout">Tentar Novamente</Link>
            </Button>
          </>
        );
      default:
        return (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <CardTitle>Processando...</CardTitle>
            <CardDescription>{message || 'Aguarde enquanto confirmamos seu pagamento.'}</CardDescription>
          </>
        );
    }
  };

  return (
    <div className="container flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader />
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4 p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}