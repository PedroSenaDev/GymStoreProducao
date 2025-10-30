import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { SalesChart } from '@/components/admin/SalesChart';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

async function fetchDashboardDataFromFunction() {
  const { data, error } = await supabase.functions.invoke('get-dashboard-data');
  if (error) {
    // Tenta fornecer uma mensagem de erro mais clara
    const errorMessage = error.context?.msg ?? error.message;
    throw new Error(errorMessage);
  }
  return data;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function DashboardHomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardDataFromFunction,
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center text-red-500">
        <div>
          <h2 className="text-xl font-bold">Erro ao carregar o dashboard</h2>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Desde o início</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data?.totalSales}</div>
            <p className="text-xs text-muted-foreground">Desde o início</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos no Site</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Total de produtos cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total de usuários registrados</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart data={data?.chartData ?? []} />
        </div>
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recentes (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data?.recentOrders?.map((order: any) => (
                <div key={order.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{order.profiles?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{order.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{order.profiles?.email}</p>
                  </div>
                  <div className="ml-auto font-medium">{formatCurrency(order.total_amount)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}