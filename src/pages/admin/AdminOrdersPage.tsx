import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/types/order";
import { Profile } from "@/types/profile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Eye, Search, Download } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import OrderDetails from "./OrderDetails";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DateRange } from "react-day-picker";
import { showError, showSuccess } from "@/utils/toast";
import * as XLSX from 'xlsx';

type OrderWithDetails = Order & {
  profiles: Pick<Profile, 'full_name' | 'cpf' | 'email' | 'phone'> | null;
  order_items: {
    quantity: number;
    products: {
      name: string;
      price: number;
      weight_kg: number;
      height_cm: number;
      width_cm: number;
      length_cm: number;
    }
  }[];
};

async function fetchOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, profiles(full_name, cpf, email, phone), order_items(*, products(*))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as OrderWithDetails[];
}

const translateStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'processing': return 'Processando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'pending': return 'secondary';
    case 'processing': return 'default';
    case 'shipped': return 'outline';
    case 'delivered': return 'default';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

export default function AdminOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: fetchOrders,
  });

  const { mutate: exportOrders, isPending: isExporting } = useMutation({
    mutationFn: async () => {
        if (!orders) throw new Error("Nenhum pedido para exportar.");

        const ordersToExport = orders.filter(order => {
            const isMontesClaros = order.shipping_zip_code?.startsWith('3940');
            return order.status === 'processing' && !isMontesClaros;
        });

        if (ordersToExport.length === 0) {
            throw new Error("Não há pedidos externos com status 'Processando' para exportar.");
        }

        const dataForSheet = ordersToExport.map(order => {
            let totalWeight = 0;
            let totalHeight = 0;
            let maxLength = 0;
            let maxWidth = 0;

            order.order_items.forEach(item => {
                const quantity = item.quantity || 1;
                totalWeight += (item.products.weight_kg || 0.1) * quantity;
                totalHeight += (item.products.height_cm || 2) * quantity;
                maxLength = Math.max(maxLength, item.products.length_cm || 16);
                maxWidth = Math.max(maxWidth, item.products.width_cm || 11);
            });

            const declaredValue = order.total_amount - (order.shipping_cost || 0);

            return {
                'CEP DESTINO': order.shipping_zip_code,
                'PESO (KG)': parseFloat(totalWeight.toFixed(3)),
                'ALTURA (CM)': Math.max(totalHeight, 2),
                'LARGURA (CM)': Math.max(maxWidth, 11),
                'COMPRIMENTO (CM)': Math.max(maxLength, 16),
                'AVISO DE RECEBIMENTO (AR)': 'NÃO',
                'MÃO PRÓPRIA (MP)': 'NÃO',
                'VALOR SEGURADO': parseFloat(declaredValue.toFixed(2)),
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Envios");
        XLSX.writeFile(workbook, `pedidos_melhor_envio_${new Date().toISOString().split('T')[0]}.xlsx`);
    },
    onSuccess: () => {
        showSuccess("Arquivo .xlsx gerado com sucesso!");
    },
    onError: (error: any) => {
        showError(error.message);
    }
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const customerName = order.profiles?.full_name?.toLowerCase() || '';
      const matchesSearch = customerName.includes(searchTerm.toLowerCase());

      const orderDate = new Date(order.created_at);
      let matchesDate = true;
      if (dateRange?.from) {
        matchesDate = matchesDate && orderDate >= startOfDay(dateRange.from);
      }
      if (dateRange?.to) {
        matchesDate = matchesDate && orderDate <= endOfDay(dateRange.to);
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, searchTerm, dateRange]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pedidos</h1>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Histórico de Pedidos</CardTitle>
              <CardDescription>
                {filteredOrders ? `${filteredOrders.length} pedido(s) encontrado(s).` : 'Carregando...'}
              </CardDescription>
            </div>
            <Button onClick={() => exportOrders()} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar para Melhor Envio
            </Button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome do cliente..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Layout de Tabela para Telas Maiores */}
              <div className="hidden md:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.profiles?.full_name || 'Cliente não encontrado'}</TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusVariant(order.status)}
                            className={cn(
                              order.status === 'delivered' && 'bg-green-600 text-white',
                              order.status === 'shipped' && 'bg-yellow-400 text-black hover:bg-yellow-400/80'
                            )}
                          >
                            {translateStatus(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Layout de Cartões para Telas Pequenas */}
              <div className="md:hidden space-y-4">
                {filteredOrders?.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{order.profiles?.full_name || 'Cliente não encontrado'}</CardTitle>
                          <CardDescription>{formatDate(order.created_at)}</CardDescription>
                        </div>
                        <Badge 
                          variant={getStatusVariant(order.status)}
                          className={cn(
                            'text-xs',
                            order.status === 'delivered' && 'bg-green-600 text-white',
                            order.status === 'shipped' && 'bg-yellow-400 text-black hover:bg-yellow-400/80'
                          )}
                        >
                          {translateStatus(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-bold">{formatCurrency(order.total_amount)}</div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && <OrderDetails orderId={selectedOrder.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}