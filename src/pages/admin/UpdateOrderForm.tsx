import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
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
import { showError, showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { Order } from "@/types/order";
import { useState } from "react";

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

type FormValues = z.infer<typeof formSchema>;

interface UpdateOrderFormProps {
  order: Order & { profiles?: { email?: string, full_name?: string } };
  onFinished: () => void;
}

export default function UpdateOrderForm({ order, onFinished }: UpdateOrderFormProps) {
  const queryClient = useQueryClient();
  const [isConfirmAlertOpen, setConfirmAlertOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: order.status,
      tracking_code: order.tracking_code || "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: values.status,
          tracking_code: values.tracking_code,
        })
        .eq("id", order.id);

      if (error) throw error;

      const statusChanged = values.status !== order.status;
      if (statusChanged && order.profiles?.email) {
        let emailSubject = '';
        let emailContent = '';
        const orderUrl = "https://gymstoremoc.vercel.app/profile/orders";

        const baseEmailStyle = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e2e2; border-radius: 8px; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #e2e2e2; padding-bottom: 20px;">
              <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #111; margin: 0;">GYMSTORE</h1>
            </div>
            <h2>Olá ${order.profiles.full_name},</h2>
        `;
        const emailFooter = `
            <p>Agradecemos pela sua compra!</p>
            <p>Atenciosamente,<br>Equipe GYMSTORE</p>
          </div>
        `;

        if (values.status === 'shipped') {
          emailSubject = `Seu pedido #${order.id.substring(0, 8)} foi enviado!`;
          emailContent = `
            ${baseEmailStyle}
            <p>Ótima notícia! Seu pedido <strong>#${order.id.substring(0, 8)}</strong> foi enviado.</p>
            ${values.tracking_code ? `<p>Você pode rastreá-lo usando o código: <strong>${values.tracking_code}</strong></p>` : ''}
            <a href="${orderUrl}" style="display: inline-block; background-color: #111; color: #ffffff; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0;">Acompanhar Meus Pedidos</a>
            ${emailFooter}
          `;
        } else if (values.status === 'delivered') {
          emailSubject = `Seu pedido #${order.id.substring(0, 8)} foi entregue!`;
          emailContent = `
            ${baseEmailStyle}
            <p>Seu pedido <strong>#${order.id.substring(0, 8)}</strong> foi marcado como entregue.</p>
            <p>Esperamos que você aproveite seus produtos! Adoraríamos saber o que você achou.</p>
            <a href="${orderUrl}" style="display: inline-block; background-color: #111; color: #ffffff; padding: 12px 24px; text-align: center; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0;">Ver Meus Pedidos</a>
            ${emailFooter}
          `;
        }

        if (emailSubject && emailContent) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: { to: order.profiles.email, subject: emailSubject, htmlContent: emailContent },
            });
            if (emailError) throw emailError;
            showSuccess("E-mail de notificação enviado ao cliente.");
          } catch (emailError: any) {
            console.error("Failed to send status update email:", emailError);
            showError("O status do pedido foi atualizado, mas falhou ao enviar o e-mail de notificação.");
          }
        }
      }
    },
    onSuccess: () => {
      showSuccess("Pedido atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["orderDetails", order.id] });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["userOrders", order.user_id] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    const statusChanged = values.status !== order.status;
    const requiresConfirmation = statusChanged && (values.status === 'shipped' || values.status === 'delivered');

    if (requiresConfirmation) {
      setPendingUpdate(values);
      setConfirmAlertOpen(true);
    } else {
      mutate(values);
    }
  };

  const handleConfirmUpdate = () => {
    if (pendingUpdate) {
      mutate(pendingUpdate);
    }
    setConfirmAlertOpen(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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

      <AlertDialog open={isConfirmAlertOpen} onOpenChange={setConfirmAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o status para "{pendingUpdate?.status ? statusTranslations[pendingUpdate.status] : ''}".
              Um e-mail de notificação será enviado para o cliente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              Confirmar e Enviar E-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}