import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, MapPin, Package, CreditCard, Truck, Edit, FileDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UpdateOrderForm from "./UpdateOrderForm";
import { Order } from "@/types/order";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OrderInvoice } from "@/components/admin/OrderInvoice";

interface OrderDetailsData extends Order {
  profiles: { full_name: string; phone: string; cpf: string; email: string; } | null;
  addresses: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
}

interface OrderItemData {
  quantity: number;
  price: number;
  selected_size?: string;
  selected_color?: { code: string; name: string };
  products: {
    name: string;
    image_urls: string[];
  } | null;
}

async function fetchOrderDetails(orderId: string) {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*, profiles(full_name, phone, cpf, email), addresses(*)")
    .eq("id", orderId)
    .single();
  if (orderError) throw new Error(orderError.message);

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("quantity, price, selected_size, selected_color, products(name, image_urls)")
    .eq("order_id", orderId);
  if (itemsError) throw new Error(itemsError.message);

  return { order: orderData as OrderDetailsData, items: itemsData as OrderItemData[] };
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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

export default function OrderDetails({ orderId }: { orderId: string }) {
  const [isUpdateDialogOpen, setUpdateDialogOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orderDetails", orderId],
    queryFn: () => fetchOrderDetails(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError || !data) {
    return <div className="text-center text-red-500 py-10">Erro ao carregar detalhes do pedido.</div>;
  }

  const { order, items } = data;

  return (
    <ScrollArea className="flex-grow pr-6 -mr-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h3 className="font-semibold">Pedido #{order.id.substring(0, 8)}</h3>
            <p className="text-sm text-muted-foreground">
              Realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <PDFDownloadLink
              document={<OrderInvoice order={order} items={items} />}
              fileName={`pedido_${order.id.substring(0, 8)}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" size="sm" disabled={loading}>
                  <FileDown className="mr-2 h-4 w-4" />
                  {loading ? 'Gerando...' : 'Gerar PDF'}
                </Button>
              )}
            </PDFDownloadLink>
            <Dialog open={isUpdateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atualizar Pedido</DialogTitle>
                </DialogHeader>
                <UpdateOrderForm order={order} onFinished={() => setUpdateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Separator />

        <div className="space-y-4">
          <h4 className="font-semibold flex items-center"><Package className="mr-2 h-4 w-4" /> Itens do Pedido</h4>
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <img
                src={item.products?.image_urls?.[0] || '/placeholder.svg'}
                alt={item.products?.name}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">{item.products?.name}</p>
                <div className="text-sm text-muted-foreground">
                  <p>{item.quantity} x {formatCurrency(item.price)}</p>
                  {item.selected_size && <p>Tamanho: {item.selected_size}</p>}
                  {item.selected_color && <p>Cor: {item.selected_color.name}</p>}
                </div>
              </div>
              <p className="font-semibold">{formatCurrency(item.quantity * item.price)}</p>
            </div>
          ))}
        </div>
        <Separator />

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.total_amount - (order.shipping_cost || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatCurrency(order.shipping_cost || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center"><CreditCard className="mr-2 h-4 w-4" /> Detalhes do Pagamento</h4>
            <div className="text-sm">
              <span className="text-muted-foreground">Método: </span>
              <span>{order.payment_method || 'Não informado'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Status: </span>
              <Badge>{translateStatus(order.status)}</Badge>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center"><Truck className="mr-2 h-4 w-4" /> Informações de Envio</h4>
            <div className="text-sm">
              <span className="text-muted-foreground">Cód. Rastreio: </span>
              <span>{order.tracking_code || 'Não disponível'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center"><User className="mr-2 h-4 w-4" /> Cliente</h4>
            <p className="text-sm">{order.profiles?.full_name}</p>
            <p className="text-sm text-muted-foreground">{order.profiles?.phone}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center"><MapPin className="mr-2 h-4 w-4" /> Endereço de Entrega</h4>
            {order.addresses ? (
              <address className="text-sm not-italic text-muted-foreground">
                {order.addresses.street}, {order.addresses.number}<br />
                {order.addresses.neighborhood}<br />
                {order.addresses.city}, {order.addresses.state} - {order.addresses.zip_code}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">Endereço não informado.</p>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}