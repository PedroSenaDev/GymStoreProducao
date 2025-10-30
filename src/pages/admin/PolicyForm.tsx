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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { Policy } from "@/types/policy";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  display_area: z.enum(['product', 'footer', 'both'], { errorMap: () => ({ message: "Selecione uma área de exibição válida." }) }),
});

interface PolicyFormProps {
  policy?: Policy;
  onFinished: () => void;
}

export default function PolicyForm({ policy, onFinished }: PolicyFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: policy?.title || "",
      content: policy?.content || "",
      display_area: policy?.display_area || 'product',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data, error } = await (policy?.id
        ? supabase.from("policies").update(values).eq("id", policy.id)
        : supabase.from("policies").insert([values]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Política ${policy?.id ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Política de Privacidade" {...field} disabled={!!policy?.id} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva a política..." {...field} rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="display_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exibir Em</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione onde exibir a política" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="product">Página do Produto</SelectItem>
                  <SelectItem value="footer">Rodapé</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Política
        </Button>
      </form>
    </Form>
  );
}