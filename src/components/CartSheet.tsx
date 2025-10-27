import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { useCartStore } from "@/store/cartStore";
import { CartItemCard } from "./CartItemCard";
import { ShoppingBag } from 'lucide-react';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const CartSheet = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { items, toggleSelectAll, removeSelectedItems } = useCartStore();

  const selectedItems = useMemo(() => items.filter(item => item.selected), [items]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const areAllSelected = useMemo(() => items.length > 0 && items.every(item => item.selected), [items]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Carrinho de Compras</SheetTitle>
          {items.length > 0 && (
            <SheetDescription>
              Você tem {items.length} item(ns) no seu carrinho.
            </SheetDescription>
          )}
        </SheetHeader>
        
        {items.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-6 py-2 border-y bg-muted/50">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={areAllSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Selecionar Todos
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={removeSelectedItems}
                disabled={selectedItems.length === 0}
              >
                Excluir
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y px-6">
                {items.map(item => (
                  <CartItemCard key={item.cartItemId} item={item} />
                ))}
              </div>
            </ScrollArea>
            
            <SheetFooter className="bg-background p-6 border-t">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                        <p className="text-xl font-bold tracking-tight">{formatCurrency(subtotal)}</p>
                    </div>
                    <Button 
                        size="lg" 
                        disabled={selectedItems.length === 0} 
                        className="w-full sm:w-auto"
                    >
                        Finalizar Compra
                    </Button>
                </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Seu carrinho está vazio</h3>
            <p className="text-sm text-muted-foreground">Adicione produtos para vê-los aqui.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};