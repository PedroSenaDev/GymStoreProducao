import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type Profile = {
  full_name: string;
  cpf: string;
  phone: string;
  isAdmin: boolean;
} | null;

type SessionContextType = {
  session: Session | null;
  profile: Profile;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (user: User) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, cpf, phone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      setProfile(null);
      return;
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      p_user_id: user.id,
    });

    if (adminError) {
      console.error('Error checking admin status:', adminError.message);
      setProfile({ ...profileData, isAdmin: false });
      return;
    }

    setProfile({ ...profileData, isAdmin: !!isAdmin });
  };

  useEffect(() => {
    // The onAuthStateChange listener fires immediately with an INITIAL_SESSION event.
    // This is the recommended way to handle session loading.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchProfile(session.user);
        } else {
          setProfile(null);
        }
        // The initial loading is finished after the first auth event is processed.
        // This ensures the loader is shown only on the very first page load.
        if (isLoading) {
          setIsLoading(false);
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
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    const channel = new BroadcastChannel('auth-logout');
    channel.postMessage('logout');
    channel.close();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, profile, isLoading, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};