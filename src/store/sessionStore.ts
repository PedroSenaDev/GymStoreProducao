import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    // O listener onAuthStateChange cuidará de atualizar o estado.
    const channel = new BroadcastChannel('auth-logout');
    channel.postMessage('logout');
    channel.close();
  },
}));