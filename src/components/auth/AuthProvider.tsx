import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    // onAuthStateChange lida com a verificação da sessão inicial (evento INITIAL_SESSION)
    // e também com mudanças subsequentes. É mais robusto do que chamar getSession() separadamente.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    const channel = new BroadcastChannel('auth-logout');
    channel.onmessage = () => {
      supabase.auth.signOut();
    };

    return () => {
      authListener.subscription.unsubscribe();
      channel.close();
    };
  }, [setSession]);

  return <>{children}</>;
};