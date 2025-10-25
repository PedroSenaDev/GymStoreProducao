import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    <Link to={`/product/${product.id}`} className="group block">
      <Card className="overflow-hidden border-2 border-transparent bg-white transition-all duration-300 group-hover:border-black group-hover:shadow-2xl">
        <CardHeader className="p-0">
          <div className="aspect-square overflow-hidden bg-gray-100">
            <img
              src={product.image_urls?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </CardHeader>
        <CardContent className="bg-black p-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg truncate">{product.name}</h3>
              <p className="text-sm text-gray-400">Ver detalhes</p>
            </div>
            <p className="flex-shrink-0 font-semibold text-lg">{formatCurrency(product.price)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};