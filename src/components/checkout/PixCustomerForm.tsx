import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
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
import { Loader2 } from "lucide-react";
import InputMask from 'react-input-mask';
import { isValidCPF, isValidPhone } from "@/lib/validators";
import { Profile } from "@/types/profile";
import { Session } from "@supabase/supabase-js";

const formSchema = z.object({
  full_name: z.string().min(3, "O nome completo é obrigatório."),
  cpf: z.string().refine(isValidCPF, { message: "CPF inválido. Use o formato 000.000.000-00." }),
  phone: z.string().refine(isValidPhone, { message: "Telefone inválido. Use o formato (00) 00000-0000." }),
  email: z.string().email("E-mail inválido."),
});

export type PixCustomerFormValues = z.infer<typeof formSchema>;

interface PixCustomerFormProps {
  profile: Profile | null;
  session: Session | null;
  onGeneratePix: (values: PixCustomerFormValues) => void;
  isGenerating: boolean;
  totalAmount: number;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function PixCustomerForm({ profile, session, onGeneratePix, isGenerating, totalAmount }: PixCustomerFormProps) {
  const form = useForm<PixCustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      cpf: profile?.cpf || "",
      phone: profile?.phone || "",
      email: session?.user.email || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onGeneratePix)} className="space-y-4">
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
                <FormControl>
                  {/* Removido InputMask para garantir que o valor enviado seja apenas dígitos */}
                  <Input placeholder="000.000.000-00" {...field} />
                </FormControl>
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
                <FormControl>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                  >
                    {(inputProps: any) => <Input {...inputProps} placeholder="(00) 00000-0000" />}
                  </InputMask>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input {...field} disabled /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isGenerating} className="w-full mt-6">
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gerar QR Code de {formatCurrency(totalAmount)}
        </Button>
      </form>
    </Form>
  );
}