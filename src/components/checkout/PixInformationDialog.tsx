import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { isValidCPF, isValidPhone } from "@/lib/validators";
import { useSessionStore } from "@/store/sessionStore";
import { useProfile } from "@/hooks/useProfile";
import { Label } from "../ui/label";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório."),
  email: z.string().email("E-mail inválido."),
  cpf: z.string().refine(isValidCPF, "CPF inválido."),
  phone: z.string().refine(isValidPhone, "Telefone inválido."),
});

interface PixInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  items: CartItem[];
  selectedAddressId: string | null;
  paymentMethod: string | null;
  shippingCost: number;
  shippingRate: { id: string | number; name: string; } | null;
  deliveryTime: string | number | null;
}

// Chave Pix estática para simulação
const STATIC_PIX_KEY = "11.222.333/0001-44"; // CNPJ fictício
const STATIC_PIX_NAME = "GYMSTORE LTDA";

export function PixInformationDialog({ open, onOpenChange, totalAmount, items, selectedAddressId, paymentMethod, shippingCost, shippingRate, deliveryTime }: PixInformationDialogProps) {
  const [isOrderCreated, setIsOrderCreated] = useState(false);
  const session = useSessionStore((state) => state.session);
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const { removeSelectedItems } = useCartStore();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.full_name || "",
      email: session?.user.email || "",
      cpf: profile?.cpf || "",
      phone: profile?.phone || "",
    },
  });

  const { mutate: createOrder, isPending: isCreatingOrder } = useMutation({
    mutationFn: async () => {
      if (!session?.user.id || !selectedAddressId || !paymentMethod || items.length === 0 || !shippingRate) {
        throw new Error("Dados do pedido incompletos para finalização.");
      }

      // Buscar o endereço completo para fazer o snapshot
      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', selectedAddressId)
        .single();
      
      if (addressError) throw new Error(`Endereço de entrega não encontrado: ${addressError.message}`);
      
      // 1. Criar o Pedido com status 'pending'
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: session.user.id, total_amount: totalAmount, status: 'pending',
        shipping_address_id: selectedAddressId, payment_method: paymentMethod,
        shipping_cost: shippingCost,
        // Não precisamos de pix_charge_id, mas podemos usar um ID de referência
        pix_charge_id: `PIX_MANUAL_${Date.now()}`, 
        shipping_service_id: shippingRate.id.toString(),
        shipping_service_name: shippingRate.name,
        delivery_time: deliveryTime?.toString(),
        // Snapshot do endereço
        shipping_street: address.street,
        shipping_number: address.number,
        shipping_complement: address.complement,
        shipping_neighborhood: address.neighborhood,
        shipping_city: address.city,
        shipping_state: address.state,
        shipping_zip_code: address.zip_code,
      }).select('id').single();
      if (orderError) throw orderError;
      
      const newOrderId = orderData.id;
      
      // 2. Criar os Itens do Pedido
      const orderItems = items.map(item => ({
        order_id: newOrderId, product_id: item.id, quantity: item.quantity,
        price: item.price, selected_size: item.selectedSize, selected_color: item.selectedColor,
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        await supabase.from('orders').delete().eq('id', newOrderId);
        throw itemsError;
      }
      
      // 3. Limpar itens do carrinho que foram comprados
      const dbIdsToDelete = items
        .map(item => item.dbCartItemId)
        .filter((id): id is string => !!id);

      if (dbIdsToDelete.length > 0) {
        const { error: cartClearError } = await supabase
            .from('cart_items')
            .delete()
            .in('id', dbIdsToDelete);
        
        if (cartClearError) {
            console.error(`Falha ao limpar os itens comprados do carrinho do usuário ${session.user.id}:`, cartClearError);
        }
      }

      return newOrderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userOrders", session?.user.id] });
      removeSelectedItems(); // Remove localmente
      setIsOrderCreated(true);
    },
    onError: (error: Error) => {
      showError(`Erro ao finalizar o pedido: ${error.message}`);
    },
  });

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(STATIC_PIX_KEY);
    showSuccess("Chave Pix copiada!");
  };

  const handleCloseDialog = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOrderCreated) {
        // Redireciona apenas se o pedido foi criado com sucesso
        navigate('/profile/orders');
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (totalAmount <= 0) {
        showError("O valor total do pedido deve ser maior que zero.");
        return;
    }
    
    // Apenas cria o pedido pendente
    createOrder();
  }

  const renderContent = () => {
    if (isOrderCreated) {
      return (
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h3 className="text-xl font-semibold">Pedido Criado com Sucesso!</h3>
          <DialogDescription className="text-base">
            Seu pedido foi registrado e está aguardando o pagamento.
          </DialogDescription>
          
          <Separator className="w-full" />

          <div className="w-full space-y-4 text-left">
            <h4 className="font-semibold">Detalhes para Pagamento Pix:</h4>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <p className="text-sm text-muted-foreground">Valor: <span className="font-bold text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}</span></p>
                <p className="text-sm text-muted-foreground">Chave (CNPJ): <span className="font-bold text-foreground">{STATIC_PIX_KEY}</span></p>
                <p className="text-sm text-muted-foreground">Nome: <span className="font-bold text-foreground">{STATIC_PIX_NAME}</span></p>
            </div>
            <Button onClick={handleCopyToClipboard} variant="outline" className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copiar Chave Pix
            </Button>
          </div>

          <DialogFooter className="w-full pt-4">
            <Button onClick={() => handleCloseDialog(false)} className="w-full">
              Ver Meus Pedidos
            </Button>
          </DialogFooter>
        </div>
      );
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="cpf" render={({ field }) => (<FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <DialogFooter>
            <Button type="submit" disabled={isCreatingOrder} className="w-full">
              {isCreatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Pedido (Pagamento Manual)
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento com Pix</DialogTitle>
          <DialogDescription>
            {isOrderCreated ? "Instruções de pagamento Pix." : "Preencha seus dados para finalizar o pedido e receber as instruções de pagamento."}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}