import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
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