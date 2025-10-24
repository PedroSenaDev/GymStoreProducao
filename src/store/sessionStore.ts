import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SessionState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null });
    const channel = new BroadcastChannel('auth-logout');
    channel.postMessage('logout');
    channel.close();
  },
}));