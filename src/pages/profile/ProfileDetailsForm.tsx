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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { showError, showSuccess } from "@/utils/toast";
import { Profile } from "@/types/profile";
import { Loader2, CalendarIcon } from "lucide-react";
import { isValidCPF, isValidPhone } from "@/lib/validators";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  full_name: z.string().min(3),
  cpf: z.string().refine(isValidCPF, { message: "CPF inválido." }),
  phone: z.string().refine(isValidPhone, { message: "Telefone inválido. Use (XX) XXXXX-XXXX." }),
  birth_date: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }).refine((date) => date < new Date(), {
    message: "A data de nascimento não pode ser no futuro.",
  }),
});

interface ProfileDetailsFormProps {
  profile: Profile;
  onFinished: () => void;
}

export default function ProfileDetailsForm({ profile, onFinished }: ProfileDetailsFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      cpf: profile?.cpf || "",
      phone: profile?.phone || "",
      birth_date: profile?.birth_date ? new Date(`${profile.birth_date}T00:00:00`) : undefined,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          cpf: values.cpf,
          phone: values.phone,
          birth_date: format(values.birth_date, 'yyyy-MM-dd'),
        })
        .eq("id", profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutate(v))}>
        <Card>
            <CardHeader>
                <CardTitle>Editar Informações</CardTitle>
                <CardDescription>Faça as alterações no seu perfil aqui. Clique em salvar quando terminar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
                <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Data de Nascimento</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                    <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                locale={ptBR}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onFinished} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}