import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Search, Save, ChevronDown, ChevronUp } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

async function fetchProductsForStock(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, code, stock, image_urls, stock_by_size")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

const StockControl = ({ product }: { product: Product }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localStockMap, setLocalStockMap] = useState<Record<string, number>>(product.stock_by_size || {});
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalStockMap(product.stock_by_size || {});
  }, [product.stock_by_size]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (newStockJson: Record<string, number>) => {
      const { error } = await supabase.rpc('update_product_stock_json', {
        p_product_id: product.id,
        p_new_stock_json: newStockJson,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(`Grade de "${product.name}" atualizada.`);
      queryClient.invalidateQueries({ queryKey: ["productsForStock"] });
      setIsExpanded(false);
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const handleUpdateSize = (size: string, qty: number) => {
    setLocalStockMap(prev => ({ ...prev, [size]: Math.max(0, qty) }));
  };

  const hasChanges = JSON.stringify(localStockMap) !== JSON.stringify(product.stock_by_size);

  return (
    <div className="w-full border rounded-lg overflow-hidden transition-all duration-200">
      <div 
        className={cn(
            "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 cursor-pointer hover:bg-zinc-50",
            isExpanded && "bg-zinc-50 border-b"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <img
          src={product.image_urls?.[0] || '/placeholder.svg'}
          alt={product.name}
          className="h-16 w-16 rounded-md object-cover flex-shrink-0"
        />
        <div className="flex-1">
          <p className="font-semibold text-base">{product.name}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>Cód: {product.code || 'N/A'}</span>
            <span className="font-bold text-foreground">Total: {product.stock}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-muted-foreground hidden sm:inline">Ver Grade</span>
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white animate-accordion-down">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
            {Object.keys(localStockMap).length > 0 ? (
                Object.entries(localStockMap).map(([size, quantity]) => (
                    <div key={size} className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">{size}</label>
                        <Input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => handleUpdateSize(size, parseInt(e.target.value) || 0)}
                            className="h-9 text-center"
                            disabled={isPending}
                        />
                    </div>
                ))
            ) : (
                <p className="col-span-full text-sm text-muted-foreground italic py-2">
                    Nenhum tamanho cadastrado. Edite o produto para adicionar uma grade.
                </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                    setIsExpanded(false);
                    setLocalStockMap(product.stock_by_size || {});
                }}
            >
                Cancelar
            </Button>
            <Button 
                size="sm" 
                onClick={(e) => {
                    e.stopPropagation();
                    mutate(localStockMap);
                }} 
                disabled={isPending || !hasChanges}
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="ml-2">Salvar Grade</span>
            </Button>
          </div>
        </div>
      )}
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <StockControl key={product.id} product={product} />
          ))
        ) : (
          <p className="text-center py-10 text-muted-foreground">Nenhum produto encontrado.</p>
        )}
      </div>
    </div>
  );
}