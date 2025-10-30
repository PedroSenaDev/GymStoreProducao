import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/resolvers";
import { z } from "@/lib/zod-pt";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { isValidCPF, isValidPhone } from "@/lib/validators";
import { useSessionStore } from "@/store/sessionStore";
import { useProfile } from "@/hooks/useProfile";
import { Label } from "../ui/label";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório."),
  email: z.string().email("E-mail inválido."),
  cpf: z.string().refine(isValidCPF, "CPF inválido."),
  phone: z.string().refine(isValidPhone, "Telefone inválido."),
});

interface PixData {
  qr_code_url: string;
  br_code: string;
  pix_charge_id: string;
}

interface PixInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onOrderPlaced: (pixChargeId: string) => void;
}

export function PixInformationDialog({ open, onOpenChange, totalAmount, onOrderPlaced }: PixInformationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const session = useSessionStore((state) => state.session);
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.full_name || "",
      email: session?.user.email || "",
      cpf: profile?.cpf || "",
      phone: profile?.phone || "",
    },
  });

  const handleCopyToClipboard = () => {
    if (pixData?.br_code) {
      navigator.clipboard.writeText(pixData.br_code);
      showSuccess("Código Pix copiado para a área de transferência!");
    }
  };

  const handleCloseAndNavigate = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen && pixData) {
      navigate('/profile/orders');
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: totalAmount,
          customerName: values.name,
          customerEmail: values.email,
          customerMobile: values.phone,
          customerDocument: values.cpf,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      setPixData(data);
      // Place the order in our DB *after* successfully generating the Pix charge
      onOrderPlaced(data.pix_charge_id);

    } catch (err: any) {
      showError(err.message || "Ocorreu um erro ao gerar o QR Code. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseAndNavigate}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento com Pix</DialogTitle>
          <DialogDescription>
            {pixData
              ? "Escaneie o QR Code ou copie o código para pagar."
              : "Preencha seus dados para gerar o QR Code do Pix."}
          </DialogDescription>
        </DialogHeader>
        
        {pixData ? (
          <div className="flex flex-col items-center gap-6 py-4">
            <img src={pixData.qr_code_url} alt="QR Code Pix" className="w-56 h-56 rounded-lg" />
            <div className="w-full space-y-2">
                <Label htmlFor="pix-code">Pix Copia e Cola</Label>
                <div className="flex items-center gap-2">
                    <Input id="pix-code" value={pixData.br_code} readOnly className="flex-1" />
                    <Button size="icon" onClick={handleCopyToClipboard}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <p className="text-sm text-center text-muted-foreground mt-2">
                Seu pedido foi registrado. Após o pagamento, o status será atualizado automaticamente.
            </p>
            <DialogFooter className="w-full">
                <Button onClick={() => handleCloseAndNavigate(false)} className="w-full">
                    Ver Meus Pedidos
                </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <DialogFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerar QR Code
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}