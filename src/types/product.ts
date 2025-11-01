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
  colors: { code: string; name: string }[];
  is_featured: boolean;
  created_at: string;
}