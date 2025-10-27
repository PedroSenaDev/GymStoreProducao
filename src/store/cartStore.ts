import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/cart';
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from './sessionStore';

interface CartState {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  addItem: (product: Product, quantity: number, size: string | null, color: string | null) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  toggleItemSelection: (cartItemId: string) => void;
  toggleSelectAll: (select: boolean) => void;
  removeSelectedItems: () => Promise<void>;
  clearCart: () => void;
}

const findItem = (items: CartItem[], cartItemId: string) => items.find(item => item.cartItemId === cartItemId);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: async (product, quantity, size, color) => {
        const cartItemId = `${product.id}-${size || 'none'}-${color || 'none'}`;
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
            selected_color: color,
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

        if (session && itemToRemove) {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .match({
              user_id: session.user.id,
              product_id: itemToRemove.id,
              selected_size: itemToRemove.selectedSize,
              selected_color: itemToRemove.selectedColor,
            });
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

        if (session && itemToUpdate) {
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .match({
              user_id: session.user.id,
              product_id: itemToUpdate.id,
              selected_size: itemToUpdate.selectedSize,
              selected_color: itemToUpdate.selectedColor,
            });
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
        const itemsToRemove = get().items.filter(item => item.selected);
        const itemsToKeep = get().items.filter(item => !item.selected);
        const session = useSessionStore.getState().session;
      
        // Optimistic UI update
        set({ items: itemsToKeep });
      
        // Sync with DB if logged in
        if (session && itemsToRemove.length > 0) {
          // Build a complex 'or' filter to delete multiple unique rows in one go
          const filters = itemsToRemove.map(item => {
            const sizeFilter = item.selectedSize ? `selected_size.eq.${item.selectedSize}` : 'selected_size.is.null';
            const colorFilter = item.selectedColor ? `selected_color.eq.${item.selectedColor}` : 'selected_color.is.null';
            return `and(product_id.eq.${item.id},${sizeFilter},${colorFilter})`;
          }).join(',');
      
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', session.user.id)
            .or(filters);
      
          if (error) {
            console.error("Error removing selected items from DB:", error);
            // Optional: Revert UI change on failure
            set({ items: [...itemsToKeep, ...itemsToRemove] });
          }
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