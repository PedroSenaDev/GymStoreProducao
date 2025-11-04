import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShippingZone } from "@/types/shipping";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, PlusCircle, MoreHorizontal, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showError, showSuccess } from "@/utils/toast";
import ShippingZoneForm from "./ShippingZoneForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// --- Store CEP Form Component ---
const cepFormSchema = z.object({
  cep: z.string().length(8, { message: "O CEP deve ter 8 dígitos, apenas números." }),
});

const StoreCepForm = () => {
  const queryClient = useQueryClient();
  const { data: cepSetting, isLoading: isLoadingCep } = useQuery({
    queryKey: ['setting', 'store_cep'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'store_cep').single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore 'not found' error
      return data?.value || '';
    }
  });

  const form = useForm<z.infer<typeof cepFormSchema>>({
    resolver: zodResolver(cepFormSchema),
    defaultValues: { cep: '' },
  });

  useEffect(() => {
    if (cepSetting) {
      form.reset({ cep: cepSetting });
    }
  }, [cepSetting, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof cepFormSchema>) => {
      const { error } = await supabase.from('settings').upsert({ key: 'store_cep', value: values.cep });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("CEP de origem atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['setting', 'store_cep'] });
    },
    onError: (error: any) => showError(error.message),
  });

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>CEP de Origem (da Loja)</CardTitle>
        <CardDescription>Este é o CEP que será usado como ponto de partida para cotar o frete com o Melhor Envio.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex items-start gap-4">
            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">CEP</FormLabel>
                  <FormControl>
                    <Input placeholder="Apenas números" {...field} disabled={isLoadingCep} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending || isLoadingCep}>
              {(isPending || isLoadingCep) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// --- Main Shipping Page Component ---
// Removendo fetchShippingZones e lógica de gerenciamento de zonas
export default function AdminShippingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configuração de Frete (Melhor Envio)</h1>
      
      <StoreCepForm />

      <Card>
        <CardHeader>
            <CardTitle>Integração Melhor Envio</CardTitle>
            <CardDescription>
                O cálculo de frete agora é feito em tempo real usando a API do Melhor Envio. Certifique-se de que o CEP de origem acima está correto e que as credenciais (MELHOR_ENVIO_ACCESS_TOKEN, etc.) estão configuradas nos segredos do Supabase.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Para que a cotação funcione, todos os produtos devem ter Peso (kg) e Dimensões (cm) preenchidos no formulário de edição de produtos.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}