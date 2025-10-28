import { useState, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Logo } from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SocialLogin = () => {
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      showError(`Erro ao entrar com Google: ${error.message}`);
    }
  }

  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Ou continue com
          </span>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
        <GoogleIcon className="mr-2 h-5 w-5" />
        Google
      </Button>
    </>
  );
};

export default function LoginPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const session = useSessionStore((state) => state.session);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      showSuccess("E-mail confirmado com sucesso! Você já pode fazer o login.");
    }
  }, [searchParams]);

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Acesse sua Conta</CardTitle>
          <CardDescription>
            Bem-vindo de volta! Entre ou crie uma nova conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Registrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="pt-6">
              <SignInForm />
              <div className="mt-4 text-center text-sm">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="h-auto p-0 font-semibold">
                      Esqueceu sua senha?
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recuperar Senha</DialogTitle>
                    </DialogHeader>
                    <ForgotPasswordForm onFinished={() => setDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
              <SocialLogin />
            </TabsContent>

            <TabsContent value="signup" className="pt-6">
              <SignUpForm />
              <SocialLogin />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}