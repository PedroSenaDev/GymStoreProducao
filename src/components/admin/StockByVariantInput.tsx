import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Color {
  code: string;
  name: string;
}

interface StockByVariantInputProps {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  colors: Color[];
}

export default function StockByVariantInput({ value = {}, onChange, colors = [] }: StockByVariantInputProps) {
  const [newSize, setNewSize] = useState("");

  // Extrai os tamanhos únicos das chaves atuais do JSON
  const sizes = useMemo(() => {
    const uniqueSizes = new Set<string>();
    Object.keys(value).forEach(key => {
      const sizePart = key.split('_')[0];
      if (sizePart) uniqueSizes.add(sizePart);
    });
    return Array.from(uniqueSizes);
  }, [value]);

  const handleAddSize = () => {
    if (!newSize) return;
    const size = newSize.toUpperCase();
    if (sizes.includes(size)) return;

    const updated = { ...value };
    if (colors.length > 0) {
      // Se houver cores, cria uma entrada para cada cor para este novo tamanho
      colors.forEach(color => {
        updated[`${size}_${color.code}`] = 0;
      });
    } else {
      // Caso contrário, cria apenas a entrada do tamanho
      updated[size] = 0;
    }
    
    onChange(updated);
    setNewSize("");
  };

  const handleUpdateQuantity = (key: string, quantity: number) => {
    onChange({ ...value, [key]: Math.max(0, quantity) });
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const updated = { ...value };
    Object.keys(updated).forEach(key => {
      if (key.startsWith(`${sizeToRemove}_`) || key === sizeToRemove) {
        delete updated[key];
      }
    });
    onChange(updated);
  };

  const totalStock = Object.values(value).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Adicionar tamanho (Ex: P, M, G, 42...)"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSize();
              }
            }}
          />
        </div>
        <Button type="button" onClick={handleAddSize} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      <div className="border rounded-md divide-y bg-muted/30">
        {sizes.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Adicione os tamanhos acima para gerenciar o estoque.
          </div>
        ) : (
          sizes.map(size => (
            <div key={size} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-lg">{size}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSize(size)}
                  className="text-destructive h-8 px-2"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remover Tamanho
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {colors.length > 0 ? (
                  colors.map(color => {
                    const key = `${size}_${color.code}`;
                    return (
                      <div key={key} className="flex flex-col gap-1.5 p-2 rounded-md bg-background border">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: color.code }} />
                          <span className="text-[10px] font-bold uppercase truncate">{color.name}</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={value[key] ?? 0}
                          onChange={(e) => handleUpdateQuantity(key, parseInt(e.target.value) || 0)}
                          className="h-8 text-center font-medium"
                        />
                      </div>
                    );
                  })
                ) : (
                  // Fallback para quando não há cores definidas
                  <div className="flex flex-col gap-1.5 p-2 rounded-md bg-background border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Estoque Geral</span>
                    <Input
                      type="number"
                      min="0"
                      value={value[size] ?? 0}
                      onChange={(e) => handleUpdateQuantity(size, parseInt(e.target.value) || 0)}
                      className="h-8 text-center font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center px-1 bg-zinc-100 p-3 rounded-lg border-2 border-dashed">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Soma total de estoque:</span>
        <span className="text-2xl font-black">{totalStock}</span>
      </div>
    </div>
  );
}