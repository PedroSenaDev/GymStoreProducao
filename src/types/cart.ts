import { Product } from './product';

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string | null;
  selectedColor: { code: string; name: string } | null;
  // Unique ID for this specific item instance in the cart (product.id + size + color)
  cartItemId: string; 
  selected: boolean;
}