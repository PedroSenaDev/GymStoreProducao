import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';

// Função para verificar se é o aniversário do usuário
const isBirthday = (birthDate: string | null | undefined): boolean => {
  if (!birthDate) return false;
  const today = new Date();
  // Adiciona T00:00:00 para garantir que o fuso horário não afete a data
  const birthday = new Date(`${birthDate}T00:00:00`);
  return today.getDate() === birthday.getDate() && today.getMonth() === birthday.getMonth();
};

// Função para buscar as configurações de desconto
async function fetchBirthdaySettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["birthday_discount_enabled", "birthday_discount_percentage"]);
  if (error) throw error;
  return data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export const BirthdayRewardNotifier = () => {
  const { data: profile } = useProfile();

  const { data: settings } = useQuery({
    queryKey: ['birthdaySettings'],
    queryFn: fetchBirthdaySettings,
  });

  useEffect(() => {
    if (profile && settings?.birthday_discount_enabled === 'true') {
      const today = new Date();
      const lastRewardDate = profile.last_birthday_reward_at ? new Date(profile.last_birthday_reward_at) : null;
      
      const hasClaimedThisYear = lastRewardDate && lastRewardDate.getFullYear() === today.getFullYear();

      if (isBirthday(profile.birth_date) && !hasClaimedThisYear) {
        toast.success("Feliz Aniversário!", {
          description: `Você ganhou ${settings.birthday_discount_percentage}% de desconto em todas as compras hoje!`,
          icon: <Gift className="h-5 w-5" />,
          duration: 10000,
        });
      }
    }
  }, [profile, settings]);

  return null; // Este componente não renderiza nada
};