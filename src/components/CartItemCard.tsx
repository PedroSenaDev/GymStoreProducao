import { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface CartItemCardProps {
  item: CartItem;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const CartItemCard = ({ item }: CartItemCardProps) => {
  const { updateQuantity, toggleItemSelection, removeItem } = useCartStore();

  return (
    <div className="flex items-start gap-4 py-4">
      <Checkbox
        checked={item.selected}
        onCheckedChange={() => toggleItemSelection(item.cartItemId)}
        className="mt-1"
        aria-label={`Selecionar ${item.name}`}
      />
      <img
        src={item.image_urls?.[0] || '/placeholder.svg'}
        alt={item.name}
        className="h-20 w-20 rounded-md object-cover"
      />
      <div className="flex-1">
        <Link to={`/product/${item.id}`} className="hover:underline">
            <h4 className="font-semibold text-sm">{item.name}</h4>
        </Link>
        <div className="text-xs text-muted-foreground space-x-2">
          {item.selectedSize && <span>Tamanho: {item.selectedSize.toUpperCase()}</span>}
          {item.selectedColor && (
            <span className="inline-flex items-center gap-1">
              Cor: <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.selectedColor.code }} />
              {item.selectedColor.name}
            </span>
          )}
        </div>
        <p className="font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center rounded-md border h-8">
            <Button variant="ghost" size="icon" className="h-full w-8" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>-</Button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <Button variant="ghost" size="icon" className="h-full w-8" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>+</Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeItem(item.cartItemId)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};