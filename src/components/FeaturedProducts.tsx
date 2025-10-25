import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { StarButton } from './ui/star-button';

async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('is_featured', true)
    .limit(3)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  // @ts-ignore
  return data;
}

export const FeaturedProducts = () => {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: fetchFeaturedProducts,
  });
  const navigate = useNavigate();

  if (isError || (!isLoading && (!products || products.length === 0))) {
    // Não renderiza a seção se houver um erro ou nenhum produto em destaque
    return null;
  }

  return (
    <section className="bg-gray-50 dark:bg-gray-900">
        <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-2xl text-center mb-12">
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Produtos em Destaque</h2>
                <p className="mt-4 text-xl text-muted-foreground">
                    Peças selecionadas que elevam seu treino a um novo patamar.
                </p>
            </div>
            
            {isLoading ? (
                 <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="space-y-4">
                        <Skeleton className="h-80 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}

            <div className="mt-16 text-center">
                <StarButton onClick={() => navigate('/products')} className="px-8 py-6 text-base">
                    Ver todos os produtos
                </StarButton>
            </div>
        </div>
    </section>
  );
};