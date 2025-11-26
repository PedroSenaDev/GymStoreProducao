import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/store/sessionStore';
import { Profile } from '@/types/profile';

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, cpf, phone, updated_at, birth_date')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    // We don't throw here because a profile might not exist yet, but we still need to check admin status.
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
    p_user_id: userId,
  });

  if (adminError) {
    console.error('Error checking admin status:', adminError.message);
    // Return a minimal profile object even if admin check fails
    return {
      id: userId,
      ...(profileData || {}),
      isAdmin: false,
    } as Profile;
  }

  // Construct the full profile object, ensuring the ID is always present.
  return {
    id: userId,
    ...(profileData || {}),
    isAdmin: !!isAdmin,
  } as Profile;
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