import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/store/sessionStore';
import { Profile } from '@/types/profile';

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, cpf, phone, updated_at')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    return null;
  }

  return {
    id: userId,
    ...profileData,
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