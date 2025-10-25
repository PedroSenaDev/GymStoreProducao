import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Link to={`/product/${product.id}`} className="group">
      <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="aspect-square overflow-hidden">
            <img
              src={product.image_urls?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg truncate">{product.name}</h3>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-xl font-bold text-primary">{formatCurrency(product.price)}</p>
        </CardFooter>
      </Card>
    </Link>
  );
};