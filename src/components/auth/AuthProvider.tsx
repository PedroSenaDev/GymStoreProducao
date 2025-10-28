import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useCartSync } from '@/hooks/useCartSync';
import { useNavigate } from 'react-router-dom';

const AuthHandler = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/update-password');
        } else if (event === 'SIGNED_IN') {
          navigate('/');
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
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
  }, [setSession, navigate]);

  return null;
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setSession, isLoading } = useSessionStore();
  
  useCartSync();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, [setSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AuthHandler />
      {children}
    </>
  );
};