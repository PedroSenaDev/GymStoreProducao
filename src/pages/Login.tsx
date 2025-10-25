import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Button } from "@/components/ui/button";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Navigate } from "react-router-dom";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export default function LoginPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const session = useSessionStore((state) => state.session);

  if (session) {
    return <Navigate to="/" replace />;
  }

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

  const SocialLoginButton = () => (
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Tabs defaultValue="signin" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Registrar</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>
                Acesse sua conta para continuar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SignInForm />
              <SocialLoginButton />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="px-0 pt-4">
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Registrar</CardTitle>
              <CardDescription>
                Crie uma nova conta para começar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
              <SocialLoginButton />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}