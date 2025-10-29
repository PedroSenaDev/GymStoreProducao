import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types/policy';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

async function fetchPolicyById(id: string): Promise<Policy> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

const LoadingSkeleton = () => (
  <div className="container py-12 md:py-20">
    <div className="max-w-3xl mx-auto">
      <Skeleton className="h-10 w-32 mb-6" />
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function PolicyPage() {
  const { id } = useParams<{ id: string }>();

  const { data: policy, isLoading, isError } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => fetchPolicyById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !policy) {
    return (
      <div className="container text-center py-20">
        <h2 className="text-2xl font-bold">Política não encontrada</h2>
        <p className="text-muted-foreground">Não foi possível encontrar a página que você está procurando.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Início
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/40">
      <div className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 -ml-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o Início
            </Link>
          </Button>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl">{policy.title}</CardTitle>
              <CardDescription>
                Última atualização em {format(new Date(policy.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-lg max-w-none text-foreground dark:prose-invert">
                <p style={{ whiteSpace: 'pre-line' }}>{policy.content}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}