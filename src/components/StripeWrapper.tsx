import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import React from 'react';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY não está definida no arquivo .env");
}
const stripePromise = loadStripe(stripePublishableKey);

interface StripeWrapperProps {
  children: React.ReactNode;
}

export const StripeWrapper: React.FC<StripeWrapperProps> = ({ children }) => {
  // O clientSecret não é necessário aqui, pois o PaymentStatusPage o recupera da URL.
  // Passamos um objeto vazio para options, pois o clientSecret é opcional para o retrievePaymentIntent.
  const options = {}; 

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};