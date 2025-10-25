import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  // The product object has a nested categories object from the query
  product: Product & { categories?: { name: string } };
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Link to={`/product/${product.id}`} className="group block outline-none">
      <Card className="overflow-hidden rounded-lg border bg-card text-card-foreground transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/20 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        <CardHeader className="p-0">
          <div className="aspect-square overflow-hidden relative">
            <img
              src={product.image_urls?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* @ts-ignore */}
            {product.categories?.name && (
              // @ts-ignore
              <Badge variant="secondary" className="absolute top-3 left-3">{product.categories.name}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-base truncate">{product.name}</h3>
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold">{formatCurrency(product.price)}</p>
            <div className={cn(
              "flex items-center font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {isMobile ? 'Detalhes' : 'Ver detalhes'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};