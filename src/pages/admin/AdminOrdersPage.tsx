import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

async function fetchAdminOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, status, total_amount, profiles(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

const LoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </CardContent>
  </Card>
);

export default function AdminOrdersPage() {
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: fetchAdminOrders,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return <div className="text-red-500">Erro ao carregar os pedidos.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos os Pedidos</CardTitle>
        <CardDescription>Gerencie os pedidos da sua loja.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data do Pedido</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.profiles?.full_name || 'Cliente'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}