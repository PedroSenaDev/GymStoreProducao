import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export default function ProductsPage() {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['publicProducts'],
    queryFn: fetchPublicProducts,
  });

  return (
    <div className="container py-8 md:py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Nossos Produtos</h1>
        <p className="mt-4 text-lg text-muted-foreground">Confira nossa coleção premium de roupas de performance.</p>
      </div>
      
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))
        ) : isError ? (
          <div className="col-span-full text-center text-red-500">
            <p>Ocorreu um erro ao carregar os produtos. Tente novamente mais tarde.</p>
          </div>
        ) : products && products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            <p>Nenhum produto encontrado no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}