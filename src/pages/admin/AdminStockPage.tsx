import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Search, Save, XCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

async function fetchProductsForStock(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, code, stock, image_urls")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

const StockControl = ({ product }: { product: Product }) => {
  const [currentStock, setCurrentStock] = useState(product.stock);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentStock(product.stock);
  }, [product.stock]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (newStockValue: number) => {
      const { error } = await supabase.rpc('update_product_stock', {
        p_product_id: product.id,
        p_new_stock: newStockValue,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(`Estoque de "${product.name}" atualizado.`);
      queryClient.invalidateQueries({ queryKey: ["productsForStock"] });
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const handleSave = () => {
    mutate(currentStock);
  };

  const handleSetOutOfStock = () => {
    setCurrentStock(0);
    mutate(0);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <Input
        type="number"
        min="0"
        value={currentStock}
        onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="h-9 w-24 text-center"
        disabled={isPending}
      />
      <Button size="sm" onClick={handleSave} disabled={isPending || currentStock === product.stock}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span className="ml-2 hidden sm:inline">Salvar</span>
      </Button>
      <Button size="sm" variant="outline" onClick={handleSetOutOfStock} disabled={isPending || product.stock === 0}>
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="ml-2 hidden sm:inline">Esgotar</span>
      </Button>
    </div>
  );
};

export default function AdminStockPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: products, isLoading } = useQuery({
    queryKey: ["productsForStock"],
    queryFn: fetchProductsForStock,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Estoque</h1>
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou código do produto..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg border p-4">
                  <img
                    src={product.image_urls?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">Código: {product.code || 'N/A'}</p>
                    <p className="text-sm">Estoque Atual: <span className="font-bold">{product.stock}</span></p>
                  </div>
                  <StockControl product={product} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}