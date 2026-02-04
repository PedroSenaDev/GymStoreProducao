export interface Product {
  id: string;
  name: string;
  description?: string;
  code: string;
  price: number;
  stock: number; // Estoque total (soma de todos os tamanhos)
  stock_by_size: Record<string, number>; // Novo campo: { "P": 10, "M": 5 }
  category_id: string;
  image_urls: string[];
  sizes: string[];
  colors: { code: string; name: string }[];
  is_featured: boolean;
  created_at: string;
  weight_kg?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
}