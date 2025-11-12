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
  created_at: string;
  payment_method?: string;
  shipping_cost?: number;
  tracking_code?: string;
  order_items?: OrderItem[]; // From Supabase join

  // Endereço 'congelado' no momento da compra
  shipping_street?: string;
  shipping_number?: string;
  shipping_complement?: string;
  shipping_neighborhood?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  
  // Mantido para referência, mas não para exibição
  shipping_address_id?: string; 
}