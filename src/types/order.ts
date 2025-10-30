import { Product } from './product';
import { Address } from './address';

export interface OrderItem {
  id: string;
  order_id: string;
  product: Product;
  quantity: number;
  price: number;
  products?: Product; // From Supabase join
  selected_size?: string;
  selected_color?: { code: string; name: string };
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: Address;
  created_at: string;
  payment_method?: string;
  shipping_cost?: number;
  tracking_code?: string;
  order_items?: OrderItem[]; // From Supabase join
}