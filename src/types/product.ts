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
  // Campos do Melhor Envio
  weight_kg: number;
  length_cm: number;
  height_cm: number;
  width_cm: number;
}