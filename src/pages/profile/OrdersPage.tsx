import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { Order } from "@/types/order";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Order[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export default function OrdersPage() {
  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["userOrders", userId],
    queryFn: () => fetchUserOrders(userId!),
    enabled: !!userId,
  });

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
      <Accordion type="single" collapsible className="w-full space-y-4">
        {orders.map((order) => (
          <AccordionItem value={order.id} key={order.id} className="border rounded-lg bg-card">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full text-left">
                <div className="flex-1">
                  <p className="font-semibold">Pedido #{order.id.substring(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">Realizado em {formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                  <span className="font-bold text-base">{formatCurrency(order.total_amount)}</span>
                  <Badge>{order.status}</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6 border-t">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center"><Package className="mr-2 h-4 w-4" /> Itens do Pedido</h4>
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img
                      src={item.products?.image_urls?.[0] || '/placeholder.svg'}
                      alt={item.products?.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.quantity * item.price)}</p>
                  </div>
                ))}
                 {order.tracking_code && (
                    <div className="pt-4">
                        <h4 className="font-semibold">Rastreio</h4>
                        <p className="text-sm text-muted-foreground">Código: {order.tracking_code}</p>
                    </div>
                 )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}