export interface Product {
  id: string;
  name: string;
  description?: string;
  code: string;
  price: number;
  stock: number; // Estoque total (soma de todas as variantes)
  /**
   * Mapeamento de estoque detalhado.
   * Pode ser apenas por tamanho: { "P": 10 }
   * Ou por variante (Tamanho + Cor): { "P_#000000": 5, "P_#FFFFFF": 3 }
   */
  stock_by_size: Record<string, number>; 
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