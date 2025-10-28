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
import { showError, showSuccess } from "@/utils/toast";
import { Policy } from "@/types/policy";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

interface AboutUsFormProps {
  policy?: Policy;
  onFinished: () => void;
}

export default function AboutUsForm({ policy, onFinished }: AboutUsFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: policy?.title || "Sobre Nossa Loja",
      content: policy?.content || "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = { ...values, display_area: 'about_us' as const };
      
      const { data, error } = await (policy?.id
        ? supabase.from("policies").update(payload).eq("id", policy.id)
        : supabase.from("policies").insert([payload]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Seção 'Sobre' atualizada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["aboutUsPolicy"] });
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
              <FormLabel>Título da Seção</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Sobre Nossa Loja" {...field} />
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
                <Textarea placeholder="Descreva a sua loja..." {...field} rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Informações
        </Button>
      </form>
    </Form>
  );
}