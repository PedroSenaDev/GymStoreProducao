import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/store/sessionStore';
import { Profile } from '@/types/profile';

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, cpf, phone')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    // Return a base profile object even if the main profile fetch fails, to check admin status
    // This might happen if the profile hasn't been created yet.
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
    p_user_id: userId,
  });

  if (adminError) {
    console.error('Error checking admin status:', adminError.message);
    return { ...(profileData || {}), isAdmin: false } as Profile;
  }

  return { ...(profileData || {}), isAdmin: !!isAdmin } as Profile;
};

export const useProfile = () => {
  const session = useSessionStore((state) => state.session);
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId, // Only run the query if the user is logged in
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
  });
};