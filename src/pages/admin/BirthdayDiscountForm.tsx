import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  enabled: z.boolean().default(false),
  percentage: z.coerce.number().min(0, "A porcentagem não pode ser negativa.").max(100, "A porcentagem não pode ser maior que 100."),
});

type Setting = { key: string; value: string };

async function fetchBirthdaySettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["birthday_discount_enabled", "birthday_discount_percentage"]);

  if (error) throw error;

  return data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export default function BirthdayDiscountForm() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["birthdaySettings"],
    queryFn: fetchBirthdaySettings,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      enabled: settings?.birthday_discount_enabled === 'true' ?? false,
      percentage: Number(settings?.birthday_discount_percentage || 0),
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const settingsToUpsert: Setting[] = [
        { key: 'birthday_discount_enabled', value: String(values.enabled) },
        { key: 'birthday_discount_percentage', value: String(values.percentage) },
      ];

      const { error } = await supabase.from("settings").upsert(settingsToUpsert, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Configurações de aniversário atualizadas!");
      queryClient.invalidateQueries({ queryKey: ["birthdaySettings"] });
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-1/4" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-6">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Ativar Desconto de Aniversário</FormLabel>
                <FormDescription>
                  Se ativo, clientes receberão um desconto no dia do aniversário.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Porcentagem de Desconto (%)</FormLabel>
              <FormControl><Input type="number" step="1" min="0" max="100" placeholder="15" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </form>
    </Form>
  );
}