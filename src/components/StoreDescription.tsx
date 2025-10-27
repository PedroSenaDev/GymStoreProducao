import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types/policy';
import { Dumbbell } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

async function fetchAboutUsPolicy(): Promise<Policy | null> {
  const { data, error } = await supabase
    .from("policies")
    .select("title, content")
    .eq('display_area', 'about_us')
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching about us policy:", error);
    return null;
  }
  return data;
}

export const StoreDescription = () => {
  const { data: policy, isLoading } = useQuery({
    queryKey: ['aboutUsPolicy'],
    queryFn: fetchAboutUsPolicy,
  });

  if (isLoading) {
    return (
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="flex justify-center md:justify-start">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      </section>
    );
  }

  if (!policy) {
    // Não renderiza nada se a política não for encontrada
    return null;
  }

  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
        <div className="flex justify-center md:justify-start">
            <Dumbbell className="h-20 w-20 md:h-24 md:w-24 text-primary" />
        </div>
        <div className="md:col-span-2 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight">{policy.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground break-words">
            {policy.content}
          </p>
        </div>
      </div>
    </section>
  );
};