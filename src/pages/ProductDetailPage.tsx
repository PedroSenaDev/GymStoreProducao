import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Policy } from '@/types/policy';
import { SizeChart } from '@/types/sizeChart';
import { Loader2, ShoppingCart, ArrowLeft, AlertTriangle, Minus, Plus } from 'lucide-react';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCartStore } from '@/store/cartStore';
import { showError, showSuccess } from '@/utils/toast';
import { RelatedProducts } from '@/components/RelatedProducts';
import { cn } from '@/lib/utils';

interface ProductWithDetails extends Product {
  categories?: { name: string };
  size_charts?: SizeChart;
}

async function fetchProductById(id: string): Promise<ProductWithDetails> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name), size_charts(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as ProductWithDetails;
}

async function fetchDisplayPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .in('display_area', ['product', 'both']);
  
  if (error) throw new Error(error.message);
  return data;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<{ code: string; name: string } | null>(null);
  const addItemToCart = useCartStore(state => state.addItem);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });

  const { data: policies } = useQuery({
    queryKey: ['displayPolicies'],
    queryFn: fetchDisplayPolicies,
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const availableStock = useMemo(() => {
    if (!product || !selectedSize) return product?.stock || 0;
    return product.stock_by_size?.[selectedSize] || 0;
  }, [product, selectedSize]);

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const sizeStock = product?.stock_by_size?.[size] || 0;
    if (quantity > sizeStock) {
        setQuantity(Math.max(1, sizeStock));
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      showError("Por favor, selecione um tamanho.");
      return;
    }
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      showError("Por favor, selecione uma cor.");
      return;
    }
    
    if (availableStock <= 0) {
        showError("Desculpe, este tamanho acabou de esgotar.");
        return;
    }

    addItemToCart(product, quantity, selectedSize, selectedColor);
    showSuccess(`${product.name} adicionado ao carrinho!`);
  };

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

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-16">
      <div className="mb-8">
        <Link to="/products" className="inline-flex items-center text-sm font-medium text-foreground transition-opacity hover:opacity-75">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Produtos
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <ProductImageGallery images={product.image_urls || []} />

        <div className="flex flex-col space-y-6">
          <div>
            {product.categories?.name && <Badge variant="outline">{product.categories.name}</Badge>}
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
          </div>
          
          <p className="text-3xl font-bold">{formatCurrency(product.price)}</p>
          
          <Separator />

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Tamanho</Label>
                {selectedSize && (
                    <span className={cn(
                        "text-xs font-medium",
                        availableStock <= 3 ? "text-orange-600" : "text-muted-foreground"
                    )}>
                        {availableStock > 0 ? `${availableStock} disponíveis` : 'Esgotado'}
                    </span>
                )}
              </div>
              <RadioGroup value={selectedSize || ''} onValueChange={handleSizeChange} className="flex flex-wrap gap-2">
                {product.sizes.map(size => {
                  const hasStock = (product.stock_by_size?.[size] || 0) > 0;
                  return (
                    <Label 
                        key={size} 
                        htmlFor={`size-${size}`} 
                        className={cn(
                            "flex cursor-pointer items-center justify-center rounded-md border-2 px-4 py-2 text-sm font-medium transition-all",
                            hasStock 
                                ? "hover:bg-accent [&:has([data-state=checked])]:border-primary" 
                                : "opacity-40 bg-muted cursor-not-allowed line-through grayscale"
                        )}
                    >
                      <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" disabled={!hasStock} />
                      {size.toUpperCase()}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <Label className="font-semibold">Cor</Label>
              <RadioGroup value={selectedColor?.code || ''} onValueChange={(code) => setSelectedColor(product.colors.find(c => c.code === code) || null)} className="flex flex-wrap gap-2">
                {product.colors.map(color => (
                  <Label key={color.code} htmlFor={`color-${color.code}`} className={`flex cursor-pointer items-center justify-center rounded-full border-2 p-1 transition-colors hover:bg-accent [&:has([data-state=checked])]:border-primary`}>
                    <RadioGroupItem value={color.code} id={`color-${color.code}`} className="sr-only" />
                    <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: color.code.toLowerCase() }} />
                  </Label>
                ))}
              </RadioGroup>
              {selectedColor && <p className="text-sm text-muted-foreground">Cor selecionada: {selectedColor.name}</p>}
            </div>
          )}

          <div className="flex items-stretch gap-3 pt-4">
            {/* Seletor de Quantidade Minimalista e Elegante */}
            <div className="flex items-center justify-between border-2 rounded-xl px-2 h-14 bg-background shadow-sm">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full hover:bg-muted"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={isOutOfStock || availableStock <= 0}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full hover:bg-muted"
                    onClick={() => setQuantity(q => Math.min(availableStock, q + 1))}
                    disabled={isOutOfStock || quantity >= availableStock}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Botão Robustos */}
            <Button 
                size="lg" 
                className="flex-1 h-14 rounded-xl text-base font-black tracking-tight shadow-xl shadow-black/10 transition-all active:scale-[0.98]" 
                onClick={handleAddToCart} 
                disabled={isOutOfStock || (selectedSize ? availableStock <= 0 : false)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isOutOfStock ? 'ESGOTADO' : (selectedSize && availableStock <= 0 ? 'SEM ESTOQUE' : 'ADICIONAR')}
            </Button>
          </div>

          {selectedSize && availableStock > 0 && availableStock <= 3 && (
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                <AlertTriangle className="h-4 w-4" />
                Últimas {availableStock} unidades!
            </div>
          )}

          <div className="space-y-2 pt-4">
            <h3 className="text-lg font-semibold">Descrição</h3>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{product.description || "Nenhuma descrição disponível."}</p>
            </div>
          </div>

          <Separator />
          
          <Accordion type="single" collapsible className="w-full">
            {product.size_charts && (
              <AccordionItem value="size-chart" className="border-none">
                <AccordionTrigger className="hover:no-underline font-semibold py-4">
                    {product.size_charts.title}
                </AccordionTrigger>
                <AccordionContent>
                  <img src={product.size_charts.image_url} alt={product.size_charts.title} className="w-full rounded-xl shadow-md border" />
                </AccordionContent>
              </AccordionItem>
            )}

            {policies?.map(policy => (
              <AccordionItem value={policy.id} key={policy.id} className="border-none">
                <AccordionTrigger className="hover:no-underline font-semibold py-4">
                    {policy.title}
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none text-muted-foreground bg-muted/30 p-4 rounded-xl">
                  <p style={{ whiteSpace: 'pre-line' }}>{policy.content}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      {product && (
        <RelatedProducts
          categoryId={product.category_id}
          currentProductId={product.id}
        />
      )}
    </div>
  );
}