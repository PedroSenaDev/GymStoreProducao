import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import React from 'react';
import CheckoutForm from './CheckoutForm';
import { Loader2 } from 'lucide-react';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY não está definida no arquivo .env");
}
const stripePromise = loadStripe(stripePublishableKey);

interface CreditCardFormWrapperProps {
  clientSecret: string | null;
  isLoading: boolean;
}

export const CreditCardFormWrapper: React.FC<CreditCardFormWrapperProps> = ({ clientSecret, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        colorText: 'hsl(var(--foreground))',
        colorBackground: 'hsl(var(--background))',
        colorDanger: 'hsl(var(--destructive))',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
};