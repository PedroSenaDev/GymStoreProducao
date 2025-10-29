import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowUpRight, DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number | null) => {
  if (value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

async function fetchDashboardStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, status, profiles(full_name, id)');
  
  if (ordersError) throw new Error(ordersError.message);

  // If there are no orders, return mock data for demonstration
  if (orders.length === 0) {
    return {
      totalRevenue: 784.50,
      salesCount: 5,
      newCustomersCount: 2,
      recentOrders: [
        { id: 'mock1', profiles: { full_name: 'Ana Silva' }, status: 'pending', created_at: new Date().toISOString(), total_amount: 159.90 },
        { id: 'mock2', profiles: { full_name: 'Carlos Souza' }, status: 'processing', created_at: new Date(Date.now() - 86400000).toISOString(), total_amount: 89.70 },
        { id: 'mock3', profiles: { full_name: 'Juliana Pereira' }, status: 'shipped', created_at: new Date(Date.now() - 172800000).toISOString(), total_amount: 249.90 },
      ],
      isMockData: true,
    };
  }

  const { count: newCustomersCount, error: customersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', thirtyDaysAgo.toISOString());

  if (customersError) throw new Error(customersError.message);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const salesCount = orders.length;
  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return { totalRevenue, salesCount, newCustomersCount, recentOrders, isMockData: false };
}

const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <div className="mt-8">
      <Skeleton className="h-96" />
    </div>
  </div>
);

export default function DashboardHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Uma visão geral da sua loja.</p>
        </div>
        {data?.isMockData && (
          <Badge variant="destructive">Modo de Demonstração</Badge>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receita Total" value={formatCurrency(data?.totalRevenue ?? 0)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Vendas" value={`+${data?.salesCount ?? 0}`} icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Novos Clientes" value={`+${data?.newCustomersCount ?? 0}`} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Últimos 30 dias" />
        <StatCard title="Status" value="Ativo" icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Pedidos Recentes</CardTitle>
          </div>
          <Button asChild size="sm" className="ml-auto gap-1">
            <Link to="/admin/orders">
              Ver Todos
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recentOrders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.profiles?.full_name || 'Cliente'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}