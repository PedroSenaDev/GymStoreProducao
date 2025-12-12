import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      // Se não houver session_id, verifica se há algum erro de auth ou redireciona
      if (searchParams.get('error')) {
        showError("Ocorreu um erro durante o pagamento. Tente novamente.");
        setStatus('error');
      } else {
        navigate('/');
      }
      return;
    }

    const checkSessionStatus = async () => {
      setMessage('Aguarde enquanto confirmamos seu pagamento...');
      
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
          // O webhook deve ter criado o pedido usando o paymentIntentId
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
          } else {
            // O pagamento foi aprovado, mas o webhook ainda não criou o pedido.
            // Isso é comum. Vamos esperar um pouco.
            setMessage('Pagamento aprovado. Aguardando confirmação final do pedido...');
            
            // Implementar um polling simples para esperar o webhook
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
                }
            }, 2000); 
            
            // Limpar o polling ao desmontar
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
        console.error("Erro ao verificar status do pagamento:", error);
        showError(error.message || 'Ocorreu um erro inesperado ao verificar o status do pagamento.');
        setMessage('Ocorreu um erro ao verificar o status do pagamento.');
        setStatus('error');
      }
    };

    checkSessionStatus();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green-500" />
            <CardTitle>Pagamento Aprovado!</CardTitle>
            <CardDescription>{message}</CardDescription>
            <Button asChild className="mt-6">
              <Link to={orderId ? `/profile/orders` : "/profile/orders"}>Ver Meus Pedidos</Link>
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