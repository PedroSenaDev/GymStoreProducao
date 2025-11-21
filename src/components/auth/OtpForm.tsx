import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod-pt";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { translateSupabaseError } from "@/utils/supabaseErrorMap";

const formSchema = z.object({
  otp: z.string().min(6, "O código deve ter 6 dígitos."),
});

interface OtpFormProps {
  email: string;
}

export function OtpForm({ email }: OtpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(90);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleResendCode() {
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      showError(translateSupabaseError(error.message));
    } else {
      showSuccess("Um novo código foi enviado para o seu e-mail.");
      setCountdown(90); // Reset timer
    }
    setIsResending(false);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: values.otp,
      type: 'signup',
    });

    if (error) {
      showError(translateSupabaseError(error.message));
    } else {
      showSuccess("Conta verificada com sucesso! Bem-vindo(a)!");
      // AuthProvider will handle the session update and redirect.
    }
    setIsLoading(false);
  }

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold">Verifique seu E-mail</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Enviamos um código de 6 dígitos para <strong>{email}</strong>.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Código de Verificação</FormLabel>
                <FormControl>
                  <InputOTP maxLength={6} {...field}>
                    <InputOTPGroup className="mx-auto">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar e Entrar
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-sm">
        {countdown > 0 ? (
          <p className="text-muted-foreground">
            Não recebeu o código? Reenviar em {Math.floor(countdown / 60)}:
            {String(countdown % 60).padStart(2, "0")}
          </p>
        ) : (
          <Button
            variant="link"
            className="h-auto p-0 font-semibold"
            onClick={handleResendCode}
            disabled={isResending}
          >
            {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reenviar código
          </Button>
        )}
      </div>
    </div>
  );
}