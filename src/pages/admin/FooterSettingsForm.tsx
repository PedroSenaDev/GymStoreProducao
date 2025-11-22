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
  email: z.string().email({ message: "E-mail inválido." }).or(z.literal('')),
  phone: z.string(),
  show: z.boolean().default(true),
});

type Setting = { key: string; value: string };

async function fetchFooterSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["footer_contact_email", "footer_contact_phone", "footer_contact_show"]);

  if (error) throw error;

  return data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export default function FooterSettingsForm() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["footerSettings"],
    queryFn: fetchFooterSettings,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      email: settings?.footer_contact_email || "",
      phone: settings?.footer_contact_phone || "",
      show: settings?.footer_contact_show === 'true' ?? true,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const settingsToUpsert: Setting[] = [
        { key: 'footer_contact_email', value: values.email },
        { key: 'footer_contact_phone', value: values.phone },
        { key: 'footer_contact_show', value: String(values.show) },
      ];

      const { error } = await supabase.from("settings").upsert(settingsToUpsert, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Configurações do rodapé atualizadas!");
      queryClient.invalidateQueries({ queryKey: ["footerSettings"] });
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail de Contato</FormLabel>
              <FormControl><Input placeholder="contato@su loja.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone/WhatsApp de Contato</FormLabel>
              <FormControl><Input placeholder="(00) 99999-9999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="show"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Exibir Contato no Rodapé</FormLabel>
                <FormDescription>
                  Se desativado, as informações de contato não aparecerão no rodapé do site.
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
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </form>
    </Form>
  );
}