import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/cart';
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from './sessionStore';
import { showError } from '@/utils/toast';

interface CartState {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  addItem: (product: Product, quantity: number, size: string | null, color: { code: string; name: string } | null) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  toggleItemSelection: (cartItemId: string) => void;
  toggleSelectAll: (select: boolean) => void;
  removeSelectedItems: () => Promise<void>;
  clearNonSelectedItems: () => Promise<void>; // NEW FUNCTION
  clearCart: () => void;
}

const findItem = (items: CartItem[], cartItemId: string) => items.find(item => item.cartItemId === cartItemId);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: async (product, quantity, size, color) => {
        const cartItemId = `${product.id}-${size || 'none'}-${color?.code || 'none'}`;
        const existingItem = findItem(get().items, cartItemId);
        const session = useSessionStore.getState().session;

        // Optimistic UI update
        if (existingItem) {
          set({
            items: get().items.map((item) =>
              item.cartItemId === cartItemId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const newItem: CartItem = {
            ...product,
            quantity,
            selectedSize: size,
            selectedColor: color,
            cartItemId,
            selected: true,
          };
          set({ items: [...get().items, newItem] });
        }

        // Sync with DB if logged in
        if (session) {
          const { error } = await supabase.from('cart_items').upsert({
            user_id: session.user.id,
            product_id: product.id,
            quantity: (existingItem?.quantity || 0) + quantity,
            selected_size: size,
            selected_color: color?.code, // Store only the code in DB
          }, { onConflict: 'user_id,product_id,selected_size,selected_color' });

          if (error) {
            console.error("Error adding item to DB:", error);
            // Revert optimistic update on error (optional)
          }
        }
      },
      removeItem: async (cartItemId) => {
        const itemToRemove = findItem(get().items, cartItemId);
        const session = useSessionStore.getState().session;

        set({ items: get().items.filter((item) => item.cartItemId !== cartItemId) });

        if (session && itemToRemove?.dbCartItemId) {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', itemToRemove.dbCartItemId);
          if (error) console.error("Error removing item from DB:", error);
        }
      },
      updateQuantity: async (cartItemId, quantity) => {
        const itemToUpdate = findItem(get().items, cartItemId);
        const session = useSessionStore.getState().session;

        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item
          ),
        });

        if (session && itemToUpdate?.dbCartItemId) {
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', itemToUpdate.dbCartItemId);
          if (error) console.error("Error updating quantity in DB:", error);
        }
      },
      toggleItemSelection: (cartItemId) => {
        set({
          items: get().items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, selected: !item.selected } : item
          ),
        });
      },
      toggleSelectAll: (select) => {
        set({
          items: get().items.map((item) => ({ ...item, selected: select })),
        });
      },
      removeSelectedItems: async () => {
        const allItems = get().items;
        const itemsToRemove = allItems.filter(item => item.selected);
        const itemsToKeep = allItems.filter(item => !item.selected);
        const session = useSessionStore.getState().session;
      
        if (itemsToRemove.length === 0) return;
      
        // Optimistic UI update
        set({ items: itemsToKeep });
      
        // Sync with DB if logged in
        if (session) {
          const dbIdsToDelete = itemsToRemove
            .map(item => item.dbCartItemId)
            .filter((id): id is string => !!id);

          if (dbIdsToDelete.length > 0) {
            const { error } = await supabase
              .from('cart_items')
              .delete()
              .in('id', dbIdsToDelete);
      
            if (error) {
              console.error("Failed to delete items from DB:", error);
              // Revert the optimistic update on failure
              set({ items: allItems });
              showError("Ocorreu um erro ao remover os itens. Tente novamente.");
            }
          }
        }
      },
      // NEW: Remove items from DB that are NOT selected locally
      clearNonSelectedItems: async () => {
        const session = useSessionStore.getState().session;
        if (!session) return;

        const nonSelectedLocalItems = get().items.filter(item => !item.selected);
        const dbIdsToDelete = nonSelectedLocalItems
            .map(item => item.dbCartItemId)
            .filter((id): id is string => !!id);

        if (dbIdsToDelete.length > 0) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .in('id', dbIdsToDelete);
            
            if (error) {
                console.error("Failed to clear non-selected items from DB:", error);
                throw new Error("Falha ao limpar itens não selecionados do carrinho.");
            }
            
            // Update local state to reflect only selected items (which should already be the case, but ensures consistency)
            set({ items: get().items.filter(item => item.selected) });
        }
      },
      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);