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