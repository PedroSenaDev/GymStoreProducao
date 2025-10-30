import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Order } from "@/types/order";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, MapPin, CreditCard, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

export default function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido #{order.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Realizado em {formatDate(order.created_at)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="space-y-6">
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
                    <p className="font-medium text-sm">{item.products?.name}</p>
                    <div className="text-xs text-muted-foreground">
                      <p>{item.quantity} x {formatCurrency(item.price)}</p>
                      {item.selected_size && <p>Tamanho: {item.selected_size}</p>}
                      {item.selected_color && <p>Cor: {item.selected_color.name}</p>}
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(item.quantity * item.price)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.total_amount - (order.shipping_cost || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatCurrency(order.shipping_cost || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center"><MapPin className="mr-2 h-4 w-4" /> Endereço de Entrega</h4>
                {order.shipping_address ? (
                  <address className="not-italic text-muted-foreground">
                    {order.shipping_address.street}, {order.shipping_address.number}<br />
                    {order.shipping_address.neighborhood}<br />
                    {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.zip_code}
                  </address>
                ) : (
                  <p className="text-muted-foreground">Endereço não informado.</p>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center"><CreditCard className="mr-2 h-4 w-4" /> Pagamento</h4>
                <p className="text-muted-foreground">
                  Método: {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'N/A'}
                </p>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Status:</h4>
                  <Badge 
                    variant={getStatusVariant(order.status)}
                    className={cn(
                        order.status === 'delivered' && 'bg-green-600 text-white',
                        order.status === 'shipped' && 'bg-yellow-400 text-black hover:bg-yellow-400/80'
                    )}
                  >
                    {translateStatus(order.status)}
                  </Badge>
                </div>
              </div>
              {order.tracking_code && (
                <div className="space-y-2 md:col-span-2">
                  <h4 className="font-semibold flex items-center"><Truck className="mr-2 h-4 w-4" /> Rastreio</h4>
                  <p className="text-muted-foreground">Código: {order.tracking_code}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}