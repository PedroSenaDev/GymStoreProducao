import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from './ui/separator';

interface RelatedProductsProps {
  categoryId: string;
  currentProductId: string;
}

async function fetchRelatedProducts(categoryId: string, currentProductId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('category_id', categoryId)
    .neq('id', currentProductId) // Exclude the current product
    .limit(4); // Limit to 4 related products

  if (error) {
    throw new Error(error.message);
  }
  // @ts-ignore
  return data;
}

export const RelatedProducts = ({ categoryId, currentProductId }: RelatedProductsProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['relatedProducts', categoryId, currentProductId],
    queryFn: () => fetchRelatedProducts(categoryId, currentProductId),
  });

  if (isLoading) {
    return (
      <div className="mt-16">
        <h2 className="text-3xl font-bold tracking-tight mb-8">Produtos Relacionados</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null; // Don't render the section if there are no related products
  }

  return (
    <div className="mt-16 md:mt-24">
        <Separator />
        <div className="py-12">
            <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Produtos Relacionados</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    </div>
  );
};