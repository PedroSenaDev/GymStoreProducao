import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";

const formSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório."),
  email: z.string().email("E-mail inválido."),
  cpf: z.string().refine(isValidCPF, "CPF inválido."),
  phone: z.string().refine(isValidPhone, "Telefone inválido."),
});

interface PixData {
  qr_code_url: string;
  br_code: string;
  pix_charge_id: string;
}

interface PixInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  items: CartItem[];
  selectedAddressId: string | null;
  paymentMethod: string | null;
}

export function PixInformationDialog({ open, onOpenChange, totalAmount, items, selectedAddressId, paymentMethod }: PixInformationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const session = useSessionStore((state) => state.session);
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const { removeSelectedItems } = useCartStore();

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
    mutationFn: async ({ pixChargeId }: { pixChargeId: string }) => {
      if (!session?.user.id) throw new Error("Usuário não autenticado.");
      if (!selectedAddressId) throw new Error("Endereço de entrega não selecionado.");
      if (!paymentMethod) throw new Error("Método de pagamento não selecionado.");
      if (items.length === 0) throw new Error("Carrinho vazio.");

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          total_amount: totalAmount,
          status: 'processing', // O pedido já nasce como 'processando'
          shipping_address_id: selectedAddressId,
          payment_method: paymentMethod,
          shipping_cost: 0, // Placeholder
          pix_charge_id: pixChargeId,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      const orderId = orderData.id;

      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        await supabase.from('orders').delete().eq('id', orderId);
        throw itemsError;
      }

      await removeSelectedItems();
      return orderData;
    },
    onSuccess: () => {
      setIsPaymentConfirmed(true);
      showSuccess("Pagamento confirmado e pedido criado!");
    },
    onError: (error: Error) => {
      showError(`Erro ao criar pedido: ${error.message}`);
    },
  });

  const handleCopyToClipboard = () => {
    if (pixData?.br_code) {
      navigator.clipboard.writeText(pixData.br_code);
      showSuccess("Código Pix copiado!");
    }
  };

  const handleCloseAndNavigate = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      navigate('/profile/orders');
    }
  };

  const handleCheckPayment = async () => {
    if (!pixData) return;
    setIsCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: { pix_charge_id: pixData.pix_charge_id },
      });

      if (error || data.error) throw new Error(error?.message || data.error);

      if (data.status === 'PAID' || data.status === 'CONFIRMED') {
        // Pagamento confirmado, AGORA sim criamos o pedido
        createOrder({ pixChargeId: pixData.pix_charge_id });
      } else {
        showError("Pagamento ainda não foi confirmado. Tente novamente em alguns instantes.");
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: totalAmount,
          customerName: values.name,
          customerEmail: values.email,
          customerMobile: values.phone,
          customerDocument: values.cpf,
        },
      });

      if (error || data.error) throw new Error(error?.message || data.error);
      setPixData(data);
    } catch (err: any) {
      showError(err.message || "Erro ao gerar QR Code.");
    } finally {
      setIsLoading(false);
    }
  }

  const renderContent = () => {
    if (isPaymentConfirmed) {
      return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <CheckCircle className="h-20 w-20 text-green-500" />
          <h3 className="text-2xl font-bold">Pagamento Confirmado!</h3>
          <p className="text-muted-foreground">
            Seu pedido foi recebido e está sendo preparado. Em breve, seu produto chegará em sua casa.
          </p>
          <DialogFooter className="w-full pt-4">
            <Button onClick={() => handleCloseAndNavigate(false)} className="w-full">
              Acompanhar Meus Pedidos
            </Button>
          </DialogFooter>
        </div>
      );
    }

    if (pixData) {
      return (
        <div className="flex flex-col items-center gap-6 py-4">
          <img src={pixData.qr_code_url} alt="QR Code Pix" className="w-56 h-56 rounded-lg" />
          <div className="w-full space-y-2">
            <Label htmlFor="pix-code">Pix Copia e Cola</Label>
            <div className="flex items-center gap-2">
              <Input id="pix-code" value={pixData.br_code} readOnly className="flex-1" />
              <Button size="icon" onClick={handleCopyToClipboard}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogFooter className="w-full flex-col sm:flex-col sm:space-x-0 gap-2">
            <Button onClick={handleCheckPayment} disabled={isCheckingPayment || isCreatingOrder} className="w-full">
              {(isCheckingPayment || isCreatingOrder) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Já efetuei o pagamento
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
              Pagar depois
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
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar QR Code
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento com Pix</DialogTitle>
          <DialogDescription>
            {isPaymentConfirmed ? "Sucesso!" : pixData ? "Escaneie o QR Code ou copie o código para pagar." : "Preencha seus dados para gerar o QR Code."}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}