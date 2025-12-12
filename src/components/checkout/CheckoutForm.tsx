import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false); // Estado de prontidão do PaymentElement

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isElementReady) { // Verifica se o elemento está pronto
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-status`,
      },
    });

    if (error) {
      showError(error.message);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        onChange={(event) => {
          // O elemento está pronto quando o evento de mudança é disparado
          // e o estado de 'complete' é verdadeiro.
          if (event.complete) {
            setIsElementReady(true);
          }
        }}
      />
      <Button disabled={isProcessing || !stripe || !elements || !isElementReady} className="w-full" type="submit">
        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pagar`}
      </Button>
    </form>
  );
}