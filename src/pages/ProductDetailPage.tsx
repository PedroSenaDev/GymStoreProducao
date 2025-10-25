import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Loader2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchProductById(id: string): Promise<Product & { categories?: { name: string } }> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-6">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Separator />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container text-center py-20">
        <h2 className="text-2xl font-bold">Produto não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível encontrar o produto que você está procurando.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-16">
      <div className="mb-8">
        <Button asChild>
          <Link to="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Produtos
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <ProductImageGallery images={product.image_urls || []} />

        <div className="flex flex-col space-y-6">
          <div>
            {/* @ts-ignore */}
            {product.categories?.name && <Badge variant="outline">{product.categories.name}</Badge>}
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
          </div>
          
          <p className="text-3xl font-bold">{formatCurrency(product.price)}</p>
          
          <Separator />

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <Label className="font-semibold">Tamanho</Label>
              <RadioGroup value={selectedSize || ''} onValueChange={setSelectedSize} className="flex flex-wrap gap-2">
                {product.sizes.map(size => (
                  <Label key={size} htmlFor={`size-${size}`} className={`flex cursor-pointer items-center justify-center rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent [&:has([data-state=checked])]:border-primary`}>
                    <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
                    {size.toUpperCase()}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <Label className="font-semibold">Cor</Label>
              <RadioGroup value={selectedColor || ''} onValueChange={setSelectedColor} className="flex flex-wrap gap-2">
                {product.colors.map(color => (
                  <Label key={color} htmlFor={`color-${color}`} className={`flex cursor-pointer items-center justify-center rounded-md border-2 p-1 transition-colors hover:bg-accent [&:has([data-state=checked])]:border-primary`}>
                    <RadioGroupItem value={color} id={`color-${color}`} className="sr-only" />
                    <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: color.toLowerCase() }} />
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center rounded-md border">
              <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</Button>
            </div>
            <Button size="sm" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Adicionar ao Carrinho
            </Button>
          </div>
          {product.stock > 0 ? (
            <p className="text-sm text-muted-foreground">{product.stock} em estoque</p>
          ) : (
            <p className="text-sm font-semibold text-destructive">Produto esgotado</p>
          )}

          <Separator />
          
          <div className="space-y-4">
            <h3 className="font-semibold">Descrição</h3>
            <p className="text-muted-foreground">{product.description || "Nenhuma descrição disponível."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}