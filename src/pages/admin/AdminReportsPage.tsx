import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { FullSalesChart } from "@/components/admin/FullSalesChart";
import { Loader2 } from "lucide-react";

async function fetchSalesData(dateRange?: DateRange) {
  const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(new Date(), 29));
  const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());

  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  if (error) throw new Error(error.message);

  const salesByDay = new Map<string, number>();
  data.forEach(order => {
    const day = format(new Date(order.created_at), 'yyyy-MM-dd');
    salesByDay.set(day, (salesByDay.get(day) || 0) + order.total_amount);
  });

  const intervalDays = eachDayOfInterval({ start: from, end: to });
  const chartData = intervalDays.map(day => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    return {
      name: format(day, 'dd/MM', { locale: ptBR }),
      total: salesByDay.get(formattedDay) || 0,
    };
  });

  return chartData;
}

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['salesReport', dateRange],
    queryFn: () => fetchSalesData(dateRange),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Relatório de Vendas</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-96 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center text-red-500">
          <p>Erro ao carregar dados: {error.message}</p>
        </div>
      ) : (
        <FullSalesChart data={data || []} />
      )}
    </div>
  );
}