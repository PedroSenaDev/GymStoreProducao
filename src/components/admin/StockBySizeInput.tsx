import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface StockBySizeInputProps {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}

export default function StockBySizeInput({ value = {}, onChange }: StockBySizeInputProps) {
  const [newSize, setNewSize] = useState("");

  const handleAddSize = () => {
    if (newSize && !value[newSize]) {
      const updated = { ...value, [newSize.toUpperCase()]: 0 };
      onChange(updated);
      setNewSize("");
    }
  };

  const handleUpdateQuantity = (size: string, quantity: number) => {
    const updated = { ...value, [size]: Math.max(0, quantity) };
    onChange(updated);
  };

  const handleRemoveSize = (size: string) => {
    const updated = { ...value };
    delete updated[size];
    onChange(updated);
  };

  const totalStock = Object.values(value).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Ex: P, M, G, 42..."
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
          <Plus className="h-4 w-4 mr-2" /> Adicionar Tamanho
        </Button>
      </div>

      <div className="border rounded-md divide-y bg-muted/30">
        {Object.keys(value).length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum tamanho adicionado à grade.
          </div>
        ) : (
          Object.entries(value).map(([size, quantity]) => (
            <div key={size} className="flex items-center justify-between p-3 gap-4">
              <div className="font-bold text-sm min-w-[50px]">{size}</div>
              <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                <Label className="sr-only">Quantidade para {size}</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => handleUpdateQuantity(size, parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveSize(size)}
                className="text-destructive h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center px-1">
        <span className="text-sm font-medium">Estoque Total calculado:</span>
        <span className="text-lg font-bold">{totalStock}</span>
      </div>
    </div>
  );
}