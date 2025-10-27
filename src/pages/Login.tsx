import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
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
  CardFooter,
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
      <div className="relative my-4">
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

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="signin" className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo />
          </div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Registrar</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card className="border-0 shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
                <CardDescription>
                  Insira seus dados para acessar sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignInForm />
                <div className="text-center text-sm">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="p-0 h-auto font-semibold">
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
              </CardContent>
              <CardFooter className="flex-col">
                <SocialLogin />
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="border-0 shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Crie sua conta</CardTitle>
                <CardDescription>
                  Preencha os campos para começar sua jornada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignUpForm />
              </CardContent>
              <CardFooter className="flex-col">
                <SocialLogin />
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden bg-muted lg:relative lg:block">
        <img
          src="https://images.unsplash.com/photo-1583454110551-21f2fa2a8a14?q=80&w=2070&auto=format&fit=crop&ixlib-rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG9тby1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Pessoa se exercitando em uma academia"
          className="h-screen w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-end p-12 text-white text-center">
            <div className="max-w-lg">
                <h2 className="text-3xl font-bold">"A força não vem da capacidade física. Vem de uma vontade indomável."</h2>
                <p className="mt-4 text-lg text-zinc-300">- Mahatma Gandhi</p>
            </div>
        </div>
      </div>
    </div>
  );
}