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
import { Checkbox } from "@/components/ui/checkbox";
import { showError, showSuccess } from "@/utils/toast";
import { FixedShippingRate } from "@/types/fixedShippingRate";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  label: z.string().min(1, "O nome da taxa é obrigatório."),
  min_order_value: z.coerce.number().min(0, "Valor mínimo não pode ser negativo."),
  price: z.coerce.number().min(0, "O preço do frete não pode ser negativo."),
  is_active: z.boolean().default(true),
});

interface FixedShippingRateFormProps {
  rate?: FixedShippingRate;
  onFinished: () => void;
}

export default function FixedShippingRateForm({ rate, onFinished }: FixedShippingRateFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: rate?.label || "",
      min_order_value: rate?.min_order_value || 0,
      price: rate?.price || 0,
      is_active: rate?.is_active ?? true,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data, error } = await (rate?.id
        ? supabase.from("fixed_shipping_rates").update(values).eq("id", rate.id)
        : supabase.from("fixed_shipping_rates").insert([values]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Taxa de frete ${rate?.id ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["fixedShippingRates"] });
      onFinished();
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(v => mutate(v))} className="space-y-6">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Taxa</FormLabel>
              <FormControl><Input placeholder="Ex: Frete Padrão" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_order_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Mínimo do Pedido (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Frete (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Taxa Ativa</FormLabel>
                <p className="text-sm text-muted-foreground">Se desmarcado, não aparecerá no checkout.</p>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Taxa
        </Button>
      </form>
    </Form>
  );
}