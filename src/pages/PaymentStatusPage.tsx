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
    const abacatePayStatus = searchParams.get('abacate_pay_status'); // Novo parâmetro

    if (!sessionId && !abacatePayStatus) {
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
          setMessage('Pagamento aprovado. Aguardando confirmação final do pedido...');
          
          // Polling para esperar o webhook criar o pedido
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
    const handleAbacatePayPending = () => {
        setMessage('Seu pedido foi registrado e está aguardando a confirmação do pagamento Pix. Verifique a página de pedidos para o status.');
        setStatus('pending');
        // Não podemos fazer polling aqui porque não temos o orderId. O cliente deve verificar a página de pedidos.
        // O webhook da Abacate Pay criará o pedido quando o pagamento for confirmado.
        clearCart(); // Limpa o carrinho local, pois o pagamento foi iniciado.
    };

    if (sessionId) {
        checkStripeSessionStatus(sessionId);
    } else if (abacatePayStatus === 'pending') {
        handleAbacatePayPending();
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