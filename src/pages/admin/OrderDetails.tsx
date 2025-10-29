import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, MapPin, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderDetailsData {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string; } | null;
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
  products: {
    name: string;
    image_urls: string[];
  } | null;
}

async function fetchOrderDetails(orderId: string) {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*, profiles(full_name, email, phone), addresses(*)")
    .eq("id", orderId)
    .single();
  if (orderError) throw new Error(orderError.message);

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("quantity, price, products(name, image_urls)")
    .eq("order_id", orderId);
  if (itemsError) throw new Error(itemsError.message);

  return { order: orderData as OrderDetailsData, items: itemsData as OrderItemData[] };
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function OrderDetails({ orderId }: { orderId: string }) {
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
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">Pedido #{order.id.substring(0, 8)}</h3>
            <p className="text-sm text-muted-foreground">
              Realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Badge>{order.status}</Badge>
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
                <p className="text-sm text-muted-foreground">
                  {item.quantity} x {formatCurrency(item.price)}
                </p>
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
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>Grátis</span>
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
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center"><User className="mr-2 h-4 w-4" /> Cliente</h4>
            <p className="text-sm">{order.profiles?.full_name}</p>
            <p className="text-sm text-muted-foreground">{order.profiles?.email}</p>
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