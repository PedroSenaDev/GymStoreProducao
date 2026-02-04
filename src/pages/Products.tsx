import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Category } from '@/types/category';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

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
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter sm:text-6xl uppercase italic">Coleção</h1>
        <p className="mt-4 text-lg text-muted-foreground">Alta performance para o seu melhor treino.</p>
      </div>

      <div className="space-y-10 mb-16">
        {/* Busca Minimalista */}
        <div className="flex justify-center">
            <div className="relative w-full max-w-lg group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-black" />
                <Input
                    type="search"
                    placeholder="O que você está procurando?"
                    className="pl-12 w-full h-14 bg-muted/30 border-none rounded-2xl text-base shadow-inner focus-visible:ring-1 focus-visible:ring-black/10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Categorias - Estilo Modern Chips */}
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                <SlidersHorizontal className="h-3 w-3" />
                Filtrar por
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                        "px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border",
                        !selectedCategory 
                            ? "bg-black text-white border-black shadow-md scale-105" 
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                    )}
                >
                    Todos
                </button>
                {isLoadingCategories ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-28 rounded-full" />
                    ))
                ) : (
                    categories?.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap",
                                selectedCategory === category.id 
                                    ? "bg-black text-white border-black shadow-md scale-105" 
                                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                            )}
                        >
                            {category.name}
                        </button>
                    ))
                )}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-8">
        {isLoadingProducts ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))
        ) : isError ? (
          <div className="col-span-full text-center text-red-500 py-20">
            <p className="font-bold">Ocorreu um erro ao carregar os produtos.</p>
            <Button variant="link" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-24 bg-muted/20 rounded-3xl border-2 border-dashed">
            <h3 className="text-xl font-bold text-black">Nenhum resultado</h3>
            <p className="mt-1">Não encontramos produtos nesta categoria com esse nome.</p>
            <Button variant="outline" className="mt-6" onClick={() => {setSearchTerm(''); setSelectedCategory(null);}}>Limpar Filtros</Button>
          </div>
        )}
      </div>
    </div>
  );
}