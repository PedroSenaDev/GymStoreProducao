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
import { showError, showSuccess } from "@/utils/toast";
import { ShippingZone } from "@/types/shipping";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  label: z.string().optional(),
  min_km: z.coerce.number().min(0, "Distância não pode ser negativa."),
  max_km: z.coerce.number().min(0, "Distância não pode ser negativa."),
  price: z.coerce.number().min(0, "Preço não pode ser negativo."),
}).refine(data => data.max_km > data.min_km, {
  message: "A distância máxima deve ser maior que a mínima.",
  path: ["max_km"],
});

interface ShippingZoneFormProps {
  zone?: ShippingZone;
  onFinished: () => void;
}

export default function ShippingZoneForm({ zone, onFinished }: ShippingZoneFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: zone?.label || "",
      min_km: zone?.min_km || 0,
      max_km: zone?.max_km || 0,
      price: zone?.price || 0,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data, error } = await (zone?.id
        ? supabase.from("shipping_zones").update(values).eq("id", zone.id)
        : supabase.from("shipping_zones").insert([values]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Faixa de frete ${zone?.id ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["shippingZones"] });
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
              <FormLabel>Nome da Faixa (Opcional)</FormLabel>
              <FormControl><Input placeholder="Ex: Zona Norte" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>De (KM)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="max_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Até (KM)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Faixa de Frete
        </Button>
      </form>
    </Form>
  );
}