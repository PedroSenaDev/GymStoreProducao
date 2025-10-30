import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { Order } from "@/types/order";
import { Loader2, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import OrderDetailsDialog from "@/components/profile/OrderDetailsDialog";

async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*)), shipping_address:shipping_address_id(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Order[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

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

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'outline';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
};

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["userOrders", userId],
    queryFn: () => fetchUserOrders(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-orders-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders', 
          filter: `user_id=eq.${userId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["userOrders", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Nenhum pedido encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">Você ainda não fez nenhuma compra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Meus Pedidos</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe o histórico e o status de suas compras.
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Pedido #{order.id.substring(0, 8)}</CardTitle>
                  <CardDescription>Realizado em {formatDate(order.created_at)}</CardDescription>
                </div>
                <Badge 
                  variant={getStatusVariant(order.status)}
                  className={cn(
                      'w-fit',
                      order.status === 'delivered' && 'bg-green-600 text-white',
                      order.status === 'shipped' && 'bg-yellow-400 text-black hover:bg-yellow-400/80'
                  )}
                >
                  {translateStatus(order.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex items-center gap-4 text-sm">
                  <img 
                    src={item.products?.image_urls?.[0] || '/placeholder.svg'} 
                    alt={item.products?.name}
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.selected_size && `Tamanho: ${item.selected_size}`}
                      {item.selected_size && item.selected_color && ' / '}
                      {item.selected_color && `Cor: ${item.selected_color.name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{item.quantity}x {formatCurrency(item.price)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted/50 px-6 py-3">
              <p className="font-semibold text-sm">Total: {formatCurrency(order.total_amount)}</p>
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="mt-2 sm:mt-0 w-full sm:w-auto">
                Ver Detalhes
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <OrderDetailsDialog 
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      />
    </div>
  );
}