import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
        options={{
          layout: 'tabs',
          billingDetails: {
            name: 'never', // O nome é preenchido pelo PI, mas o Stripe pode solicitar o endereço
            email: 'never',
            phone: 'never',
            address: {
              country: 'never',
              postalCode: 'never',
            },
          },
          fields: {
            billingDetails: {
              address: {
                country: 'never',
                postalCode: 'never',
              },
            },
          },
        }}
      />
      <Button disabled={isProcessing || !stripe || !elements} className="w-full" type="submit">
        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pagar`}
      </Button>
    </form>
  );
}