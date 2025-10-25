import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Category } from '@/types/category';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  // @ts-ignore
  return data;
}

async function fetchCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
  
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading: isLoadingProducts, isError } = useQuery({
    queryKey: ['publicProducts'],
    queryFn: fetchPublicProducts,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="container py-8 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Nossos Produtos</h1>
        <p className="mt-4 text-lg text-muted-foreground">Confira nossa coleção premium de roupas de performance.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar produtos..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className="flex-shrink-0"
          >
            Todos
          </Button>
          {isLoadingCategories ? (
            <Skeleton className="h-10 w-24 rounded-md" />
          ) : (
            categories?.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.name}
              </Button>
            ))
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoadingProducts ? (
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
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-16">
            <h3 className="text-2xl font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-2">Tente ajustar sua busca ou filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}