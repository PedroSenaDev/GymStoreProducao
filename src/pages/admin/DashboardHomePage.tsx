import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { SalesChart } from '@/components/admin/SalesChart';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DateRangePicker } from '@/components/admin/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

async function fetchDashboardData(dateRange?: DateRange) {
  const fromDate = dateRange?.from ? startOfDay(dateRange.from) : subDays(new Date(), 7);
  const toDate = dateRange?.to ? endOfDay(dateRange.to) : new Date();

  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  // Fetch orders within the date range for revenue and sales metrics
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, profiles(full_name, email)')
    .gte('created_at', fromISO)
    .lte('created_at', toISO);
  if (ordersError) throw ordersError;

  // Fetch total counts for products and customers, independent of the date range
  const [totalProductsData, totalCustomersData] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
  ]);

  // Process metrics based on the filtered orders
  const totalRevenue = ordersData.reduce((acc, order) => acc + order.total_amount, 0);
  const salesCount = ordersData.length;

  // Process chart data
  const salesByDayMap = new Map<string, number>();
  ordersData.forEach(order => {
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

  // Get recent orders
  const recentOrders = ordersData
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    totalRevenue,
    salesCount,
    totalProducts: totalProductsData.count ?? 0,
    totalCustomers: totalCustomersData.count ?? 0,
    recentOrders,
    chartData,
  };
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function DashboardHomePage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardData', date],
    queryFn: () => fetchDashboardData(date),
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <DateRangePicker date={date} onDateChange={setDate} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Período)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas (Período)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data?.salesCount}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
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
              <CardTitle>Pedidos Recentes (Período)</CardTitle>
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