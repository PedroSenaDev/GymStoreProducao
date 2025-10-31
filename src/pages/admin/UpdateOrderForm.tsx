import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@/lib/zod-pt";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { Order } from "@/types/order";

const orderStatus = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

const statusTranslations: Record<typeof orderStatus[number], string> = {
  pending: "Pendente",
  processing: "Processando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const formSchema = z.object({
  status: z.enum(orderStatus),
  tracking_code: z.string().optional(),
});

interface UpdateOrderFormProps {
  order: Order & { profiles?: { email?: string, full_name?: string } };
  onFinished: () => void;
}

export default function UpdateOrderForm({ order, onFinished }: UpdateOrderFormProps) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: order.status,
      tracking_code: order.tracking_code || "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: values.status,
          tracking_code: values.tracking_code,
        })
        .eq("id", order.id);

      if (error) throw error;
      return values; // Pass values to onSuccess
    },
    onSuccess: async (values) => {
      showSuccess("Pedido atualizado com sucesso!");
      
      // Enviar e-mail se necessário
      if ((values.status === 'shipped' || values.status === 'delivered') && order.profiles?.email) {
        const toastId = showLoading("Enviando e-mail de notificação...");
        const subject = values.status === 'shipped' 
          ? `Seu Pedido #${order.id.substring(0, 8)} foi enviado!`
          : `Seu Pedido #${order.id.substring(0, 8)} foi entregue!`;
        
        const body = values.status === 'shipped'
          ? `<p>Olá, ${order.profiles.full_name}. Seu pedido foi enviado e está a caminho!</p>
             ${values.tracking_code ? `<p>Código de rastreio: <strong>${values.tracking_code}</strong></p>` : ''}
             <p>Acompanhe o status em: <a href="${window.location.origin}/profile/orders">Meus Pedidos</a></p>`
          : `<p>Olá, ${order.profiles.full_name}. Ótima notícia! Seu pedido foi entregue.</p>
             <p>Esperamos que você goste dos seus produtos! Para ver detalhes, acesse: <a href="${window.location.origin}/profile/orders">Meus Pedidos</a></p>`;

        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: order.profiles.email,
            subject,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #111;">${subject}</h1>
                ${body}
                <p>Atenciosamente,<br>Equipe GYMSTORE</p>
              </div>
            `,
          },
        });
        dismissToast(toastId);
        if (emailError) showError("Falha ao enviar e-mail de notificação.");
        else showSuccess("E-mail de notificação enviado ao cliente.");
      }

      queryClient.invalidateQueries({ queryKey: ["orderDetails", order.id] });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["userOrders", order.user_id] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (values.status === 'shipped' || values.status === 'delivered') {
      setPendingValues(values);
      setIsConfirming(true);
    } else {
      mutate(values);
    }
  };

  const handleConfirm = () => {
    if (pendingValues) {
      mutate(pendingValues);
    }
    setIsConfirming(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status do Pedido</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {orderStatus.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusTranslations[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tracking_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Rastreio</FormLabel>
                <FormControl>
                  <Input placeholder="Insira o código de rastreio" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </form>
      </Form>
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
                <AlertDialogDescription>
                    Você tem certeza? Alterar o status para "{pendingValues?.status ? statusTranslations[pendingValues.status] : ''}" enviará um e-mail de notificação para o cliente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                    Confirmar e Enviar E-mail
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}