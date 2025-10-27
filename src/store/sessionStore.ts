import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from './cartStore';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  logout: async () => {
    await supabase.auth.signOut();
    // Limpa o carrinho local ao fazer logout
    useCartStore.getState().clearCart();
    // O listener onAuthStateChange cuidará de atualizar o estado da sessão.
    const channel = new BroadcastChannel('auth-logout');
    channel.postMessage('logout');
    channel.close();
  },
}));