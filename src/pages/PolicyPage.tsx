import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types/policy';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchPolicyById(id: string): Promise<Policy> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export default function PolicyPage() {
  const { id } = useParams<{ id: string }>();

  const { data: policy, isLoading, isError } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => fetchPolicyById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container py-16">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="container text-center py-20">
        <h2 className="text-2xl font-bold">Política não encontrada</h2>
        <p className="text-muted-foreground">Não foi possível encontrar a página que você está procurando.</p>
        <Link to="/" className="mt-4 inline-flex items-center text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o Início
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-6">{policy.title}</h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p style={{ whiteSpace: 'pre-line' }}>{policy.content}</p>
        </div>
      </div>
    </div>
  );
}