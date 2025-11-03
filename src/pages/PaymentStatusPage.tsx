import { useEffect, useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PaymentStatusPage() {
  const stripe = useStripe();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      navigate('/');
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Pagamento aprovado com sucesso!');
          setStatus('success');
          break;
        case 'processing':
          setMessage('Seu pagamento está sendo processado.');
          setStatus('loading');
          break;
        case 'requires_payment_method':
          setMessage('Falha no pagamento. Por favor, tente outro método.');
          setStatus('error');
          break;
        default:
          setMessage('Algo deu errado.');
          setStatus('error');
          break;
      }
    });
  }, [stripe, navigate]);

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