import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/cart';
import { Product } from '@/types/product';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number, size: string | null, color: string | null) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  toggleItemSelection: (cartItemId: string) => void;
  toggleSelectAll: (select: boolean) => void;
  removeSelectedItems: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity, size, color) => {
        const cartItemId = `${product.id}-${size || 'none'}-${color || 'none'}`;
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.cartItemId === cartItemId);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
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
            selected: true, // Items are selected by default when added
          };
          set({ items: [...currentItems, newItem] });
        }
      },
      removeItem: (cartItemId) => {
        set({ items: get().items.filter((item) => item.cartItemId !== cartItemId) });
      },
      updateQuantity: (cartItemId, quantity) => {
        set({
          items: get().items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: Math.max(0, quantity) } : item
          ).filter(item => item.quantity > 0), // Remove if quantity is 0
        });
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
      removeSelectedItems: () => {
        set({ items: get().items.filter((item) => !item.selected) });
      },
      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'cart-storage', // name of the item in the storage (must be unique)
    }
  )
);