import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
import { useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Send } from "lucide-react";

const formSchema = z.object({
  subject: z.string().min(3, "O assunto é obrigatório."),
  htmlContent: z.string().min(10, "O conteúdo do e-mail é obrigatório."),
});

export default function AdminCampaignsPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      htmlContent: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: values,
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(`Campanha enviada para ${data.sentTo} usuário(s)!`);
      form.reset();
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Campanhas de E-mail</h1>
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Campanha</CardTitle>
          <CardDescription>
            Escreva e envie um e-mail marketing para todos os usuários cadastrados no site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto do E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Novidades da Semana!" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="htmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo do E-mail (HTML)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="<p>Olá!</p><p>Confira nossas promoções...</p>"
                        {...field}
                        rows={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isPending ? "Enviando..." : "Enviar Campanha para Todos os Usuários"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}