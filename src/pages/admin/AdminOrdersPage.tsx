import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Eye, Search } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import OrderDetails from "./OrderDetails";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DateRange } from "react-day-picker";

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
    } | null // Adicionado | null para produtos excluídos
  }[];
};

async function fetchOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("orders")
    // Usando a sintaxe de Left Join para garantir que order_items e products sejam retornados mesmo se o produto for nulo
    .select("*, profiles(full_name, cpf, email, phone), order_items(quantity, products(name, price, weight_kg, height_cm, width_cm, length_cm))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as OrderWithDetails[];
}

const translateStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'processing': return 'Pagamento Aprovado';
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