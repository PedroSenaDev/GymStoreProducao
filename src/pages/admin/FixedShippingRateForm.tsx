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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { FixedShippingRate } from "@/types/fixedShippingRate";
import { Loader2, Truck, Store } from "lucide-react";

const formSchema = z.object({
  label: z.string().min(1, "O nome da taxa é obrigatório."),
  min_order_value: z.coerce.number().min(0, "Valor mínimo não pode ser negativo."),
  price: z.coerce.number().min(0, "O preço do frete não pode ser negativo."),
  delivery_time_days: z.coerce.number().int("O prazo deve ser um número inteiro.").min(0, "O prazo não pode ser negativo."),
  is_active: z.boolean().default(true),
  icon_type: z.enum(['truck', 'store']).default('truck'),
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
      delivery_time_days: rate?.delivery_time_days || 1,
      is_active: rate?.is_active ?? true,
      icon_type: rate?.icon_type || 'truck',
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
              <FormControl><Input placeholder="Ex: Retirada na Loja ou Frete Fixo" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
              control={form.control}
              name="delivery_time_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Entrega (dias)</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder="Ex: 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
          />
          <FormField
            control={form.control}
            name="icon_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ícone de Exibição</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="truck">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>Entrega (Caminhão)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="store">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>Retirada (Loja)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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