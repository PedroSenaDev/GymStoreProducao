import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { useMemo } from 'react';

export default function CheckoutPage() {
  const session = useSessionStore((state) => state.session);
  const items = useCartStore((state) => state.items);
  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);

  if (!session) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (selectedItems.length === 0) {
    // Redirect to products page if cart is empty
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="container py-8 md:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">Checkout</h1>
        <p>Esta é a página de checkout. Aqui você poderá revisar seu pedido, adicionar endereço e informações de pagamento.</p>
        {/* Checkout steps will be added here */}
      </div>
    </div>
  );
}