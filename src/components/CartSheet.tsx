import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
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
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg h-[75vh] sm:h-full">
        <SheetHeader className="px-6">
          <SheetTitle>Carrinho de Compras</SheetTitle>
        </SheetHeader>
        <Separator />
        {items.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="flex items-center justify-between py-4">
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
                {areAllSelected && (
                  <Button variant="destructive" size="sm" onClick={removeSelectedItems}>
                    Excluir Selecionados
                  </Button>
                )}
              </div>
              <Separator />
              <div className="divide-y">
                {items.map(item => (
                  <CartItemCard key={item.cartItemId} item={item} />
                ))}
              </div>
            </div>
            <Separator />
            <SheetFooter className="bg-background p-6 space-y-4">
              <div className="flex justify-between text-base font-medium">
                <p>Subtotal</p>
                <p>{formatCurrency(subtotal)}</p>
              </div>
              <Button className="w-full" size="lg">Finalizar Compra</Button>
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