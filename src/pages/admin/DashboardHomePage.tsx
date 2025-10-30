import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { SalesChart } from '@/components/admin/SalesChart';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

async function fetchDashboardStats() {
  const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

  // Promise.all para buscar todos os dados em paralelo
  const [
    ordersResponse,
    productsResponse,
    customersResponse,
    recentOrdersResponse
  ] = await Promise.all([
    supabase.from('orders').select('total_amount, created_at', { count: 'exact' }),
    supabase.from('products').select('id', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase
      .from('orders')
      .select('id, total_amount, created_at, profiles(full_name)')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
  ]);

  if (ordersResponse.error) throw new Error(`Erro ao buscar pedidos: ${ordersResponse.error.message}`);
  if (productsResponse.error) throw new Error(`Erro ao buscar produtos: ${productsResponse.error.message}`);
  if (customersResponse.error) throw new Error(`Erro ao buscar clientes: ${customersResponse.error.message}`);
  if (recentOrdersResponse.error) throw new Error(`Erro ao buscar pedidos recentes: ${recentOrdersResponse.error.message}`);

  // Processamento dos dados
  const totalRevenue = ordersResponse.data.reduce((acc, order) => acc + order.total_amount, 0);
  const totalSales = ordersResponse.count ?? 0;
  const totalProducts = productsResponse.count ?? 0;
  const totalCustomers = customersResponse.count ?? 0;

  // Preparar dados para o gráfico
  const salesByDay = new Map<string, number>();
  recentOrdersResponse.data.forEach(order => {
    const day = format(new Date(order.created_at), 'yyyy-MM-dd');
    salesByDay.set(day, (salesByDay.get(day) || 0) + order.total_amount);
  });

  const chartData = eachDayOfInterval({ start: sevenDaysAgo, end: new Date() }).map(day => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    return {
      name: format(day, 'dd/MM'),
      total: salesByDay.get(formattedDay) || 0,
    };
  });

  return {
    totalRevenue,
    totalSales,
    totalProducts,
    totalCustomers,
    recentOrders: recentOrdersResponse.data.slice(0, 5),
    chartData,
  };
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function DashboardHomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: fetchDashboardStats,
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
              <CardTitle>Pedidos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data?.recentOrders?.map((order: any) => (
                <div key={order.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{order.profiles?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{order.profiles?.full_name}</p>
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