import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { SalesChart } from '@/components/admin/SalesChart';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

async function fetchDashboardData() {
  const fromDate = startOfDay(subDays(new Date(), 7));
  const toDate = endOfDay(new Date());

  // Fetch all data concurrently for better performance
  const [
    totalsResponse,
    ordersResponse,
    recentOrdersResponse
  ] = await Promise.all([
    supabase.rpc('get_dashboard_totals'),
    supabase.from('orders').select('id, total_amount'),
    supabase
      .from('orders')
      .select('id, total_amount, created_at, profiles(full_name, email)')
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .order('created_at', { ascending: false })
  ]);

  // Handle potential errors
  if (totalsResponse.error) throw totalsResponse.error;
  if (ordersResponse.error) throw ordersResponse.error;
  if (recentOrdersResponse.error) throw recentOrdersResponse.error;

  // Process total metrics
  const totalRevenue = ordersResponse.data.reduce((acc, order) => acc + order.total_amount, 0);
  const totalSales = ordersResponse.data.length;
  const { totalProducts, totalCustomers } = totalsResponse.data;

  // Process chart data for the last 7 days
  const recentOrdersData = recentOrdersResponse.data;
  const salesByDayMap = new Map<string, number>();
  recentOrdersData.forEach(order => {
    const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
    const currentTotal = salesByDayMap.get(orderDate) || 0;
    salesByDayMap.set(orderDate, currentTotal + order.total_amount);
  });

  const intervalDays = eachDayOfInterval({ start: fromDate, end: toDate });
  const chartData = intervalDays.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return {
      name: format(day, 'dd/MM'),
      total: salesByDayMap.get(dateKey) || 0,
    };
  });

  const recentOrders = recentOrdersData.slice(0, 5);

  return {
    totalRevenue,
    totalSales,
    totalProducts,
    totalCustomers,
    recentOrders,
    chartData,
  };
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function DashboardHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Total de produtos cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total de clientes registrados</p>
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
              {data?.recentOrders?.map(order => (
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