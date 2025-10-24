export interface Product {
  id: string;
  name: string;
  description?: string;
  code: string;
  price: number;
  stock: number;
  category_id: string;
  image_urls: string[];
  sizes: string[];
  colors: string[];
  is_featured: boolean;
  created_at: string;
}