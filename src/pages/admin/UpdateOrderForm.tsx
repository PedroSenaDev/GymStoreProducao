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
import { showError, showSuccess } from "@/utils/toast";
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

      const statusChanged = values.status !== order.status;
      if (statusChanged && order.profiles?.email) {
        let emailSubject = '';
        let emailContent = '';

        if (values.status === 'shipped') {
          emailSubject = `Seu pedido #${order.id.substring(0, 8)} foi enviado!`;
          emailContent = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Olá ${order.profiles.full_name},</h2>
              <p>Ótima notícia! Seu pedido <strong>#${order.id.substring(0, 8)}</strong> da GYMSTORE foi enviado.</p>
              ${values.tracking_code ? `<p>Você pode rastreá-lo usando o código: <strong>${values.tracking_code}</strong></p>` : '<p>Em breve você receberá o código de rastreio.</p>'}
              <p>Agradecemos pela sua compra!</p>
              <p>Atenciosamente,<br>Equipe GYMSTORE</p>
            </div>
          `;
        } else if (values.status === 'delivered') {
          emailSubject = `Seu pedido #${order.id.substring(0, 8)} foi entregue!`;
          emailContent = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Olá ${order.profiles.full_name},</h2>
              <p>Seu pedido <strong>#${order.id.substring(0, 8)}</strong> da GYMSTORE foi marcado como entregue.</p>
              <p>Esperamos que você aproveite seus produtos! Adoraríamos saber o que você achou.</p>
              <p>Agradecemos pela sua compra!</p>
              <p>Atenciosamente,<br>Equipe GYMSTORE</p>
            </div>
          `;
        }

        if (emailSubject && emailContent) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: order.profiles.email,
                subject: emailSubject,
                htmlContent: emailContent,
              },
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(mutate)} className="space-y-6">
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
  );
}