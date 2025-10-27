import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/cart';
import { Product } from '@/types/product';

// Function to fetch full product details for cart items from DB
const fetchCartProducts = async (dbItems: any[]): Promise<CartItem[]> => {
    const productIds = dbItems.map(item => item.product_id);
    if (productIds.length === 0) return [];

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

    if (error) {
        console.error("Error fetching product details for cart:", error);
        return [];
    }

    const productsMap = new Map<string, Product>(products.map(p => [p.id, p]));

    return dbItems.map(item => {
        const product = productsMap.get(item.product_id);
        if (!product) return null;

        return {
            ...product,
            quantity: item.quantity,
            selectedSize: item.selected_size,
            selectedColor: item.selected_color,
            cartItemId: `${product.id}-${item.selected_size || 'none'}-${item.selected_color || 'none'}`,
            selected: true, // Default to selected when fetching from DB
        };
    }).filter((item): item is CartItem => item !== null);
};

export const useCartSync = () => {
    const session = useSessionStore((state) => state.session);
    const { items: localCart, setItems, clearCart: clearLocalCart } = useCartStore();
    const isSyncing = useRef(false);
    const hasSynced = useRef(false);

    useEffect(() => {
        const syncCart = async () => {
            if (isSyncing.current || !session) {
                if (!session && hasSynced.current) {
                    // User logged out, clear the cart
                    clearLocalCart();
                    hasSynced.current = false;
                }
                return;
            }

            if (hasSynced.current) return;

            isSyncing.current = true;

            try {
                // 1. Fetch remote cart
                const { data: remoteDbItems, error: fetchError } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('user_id', session.user.id);

                if (fetchError) throw fetchError;

                const remoteCart = await fetchCartProducts(remoteDbItems);
                const remoteCartMap = new Map(remoteCart.map(item => [item.cartItemId, item]));

                // 2. Merge local (anonymous) cart with remote cart
                const itemsToUpload = localCart.filter(localItem => !remoteCartMap.has(localItem.cartItemId));

                if (itemsToUpload.length > 0) {
                    const { error: uploadError } = await supabase.from('cart_items').upsert(
                        itemsToUpload.map(item => ({
                            user_id: session.user.id,
                            product_id: item.id,
                            quantity: item.quantity,
                            selected_size: item.selectedSize,
                            selected_color: item.selectedColor,
                        })),
                        { onConflict: 'user_id,product_id,selected_size,selected_color' }
                    );
                    if (uploadError) console.error("Error syncing local cart to DB:", uploadError);
                }

                // 3. Fetch the final, merged cart from DB
                const { data: finalDbItems, error: finalFetchError } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('user_id', session.user.id);

                if (finalFetchError) throw finalFetchError;

                const finalCart = await fetchCartProducts(finalDbItems);
                setItems(finalCart);
                hasSynced.current = true;

            } catch (error) {
                console.error("Cart synchronization failed:", error);
            } finally {
                isSyncing.current = false;
            }
        };

        syncCart();

    }, [session, localCart, setItems, clearLocalCart]);
};