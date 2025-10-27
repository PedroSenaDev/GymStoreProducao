import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setSession, isLoading } = useSessionStore();

  useEffect(() => {
    // Garante que a sessão inicial seja carregada antes de qualquer outra coisa.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuta por mudanças de autenticação (login, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Sincroniza o logout entre abas
    const channel = new BroadcastChannel('auth-logout');
    channel.onmessage = () => {
      supabase.auth.signOut();
    };

    return () => {
      authListener.subscription.unsubscribe();
      channel.close();
    };
  }, [setSession]);

  // Exibe uma tela de carregamento enquanto a sessão inicial é verificada.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};