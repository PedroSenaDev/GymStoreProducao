import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform-resolvers/zod";
import * as z from "zod";
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
import { Address } from "@/types/address";
import { Loader2 } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useEffect, useState } from "react";

const formSchema = z.object({
  zip_code: z.string().length(8, "CEP deve ter 8 dígitos."),
  street: z.string().min(1, "Rua é obrigatória."),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório."),
  city: z.string().min(1, "Cidade é obrigatória."),
  state: z.string().min(1, "Estado é obrigatório."),
  is_default: z.boolean().default(false),
});

interface AddressFormProps {
  address?: Address;
  onFinished: () => void;
}

export default function AddressForm({ address, onFinished }: AddressFormProps) {
  const queryClient = useQueryClient();
  const session = useSessionStore((state) => state.session);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      zip_code: address?.zip_code || "",
      street: address?.street || "",
      number: address?.number || "",
      complement: address?.complement || "",
      neighborhood: address?.neighborhood || "",
      city: address?.city || "",
      state: address?.state || "",
      is_default: address?.is_default || false,
    },
  });

  const cep = form.watch("zip_code");

  useEffect(() => {
    const fetchCep = async () => {
      if (cep?.length === 8) {
        setIsFetchingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          if (data.erro) {
            showError("CEP não encontrado.");
            return;
          }
          
          if (data.localidade !== "Montes Claros" || data.uf !== "MG") {
            showError("Desculpe, no momento só aceitamos endereços de Montes Claros, MG.");
            form.reset({ ...form.getValues(), zip_code: cep, street: "", neighborhood: "", city: "", state: "" });
            return;
          }

          form.setValue("street", data.logradouro);
          form.setValue("neighborhood", data.bairro);
          form.setValue("city", data.localidade);
          form.setValue("state", data.uf);
        } catch (error) {
          showError("Erro ao buscar CEP. Tente novamente.");
        } finally {
          setIsFetchingCep(false);
        }
      }
    };
    fetchCep();
  }, [cep, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!session?.user.id) throw new Error("Usuário não autenticado.");
      
      const payload = { ...values, user_id: session.user.id };

      const { data, error } = await (address?.id
        ? supabase.from("addresses").update(payload).eq("id", address.id)
        : supabase.from("addresses").insert([payload]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Endereço ${address?.id ? 'atualizado' : 'salvo'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["addresses", session?.user.id] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
        <FormField
          control={form.control}
          name="zip_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="Apenas números" {...field} />
                  {isFetchingCep && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                    <FormItem className="col-span-2">
                    <FormLabel>Rua</FormLabel>
                    <FormControl><Input {...field} readOnly /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="complement"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl><Input {...field} readOnly /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                    <FormItem className="col-span-2">
                    <FormLabel>Cidade</FormLabel>
                    <FormControl><Input {...field} readOnly /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl><Input {...field} readOnly /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Tornar este o endereço padrão</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Endereço
        </Button>
      </form>
    </Form>
  );
}