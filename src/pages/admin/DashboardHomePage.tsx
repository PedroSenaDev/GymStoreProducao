import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { SalesChart } from '@/components/admin/SalesChart';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

async function fetchDashboardData() {
  // Fetch all data in parallel
  const [
    totalRevenueData,
    salesCountData,
    productsCountData,
    customersCountData,
    recentOrdersData,
    sevenDaysOrdersData
  ] = await Promise.all([
    supabase.from('orders').select('total_amount'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id, total_amount, profiles(full_name, email)').order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
  ]);

  // Process total revenue
  const totalRevenue = totalRevenueData.data?.reduce((acc, order) => acc + order.total_amount, 0) ?? 0;

  // Process chart data
  const salesByDay = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
      date: d.toISOString().split('T')[0],
      total: 0,
    };
  }).reverse();

  sevenDaysOrdersData.data?.forEach(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    const dayData = salesByDay.find(d => d.date === orderDate);
    if (dayData) {
      dayData.total += order.total_amount;
    }
  });

  return {
    totalRevenue,
    salesCount: salesCountData.count ?? 0,
    productsCount: productsCountData.count ?? 0,
    customersCount: customersCountData.count ?? 0,
    recentOrders: recentOrdersData.data,
    chartData: salesByDay,
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
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data?.salesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.productsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data?.customersCount}</div>
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