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

export default function LoginPage() {
  const [formType, setFormType] = useState<'signin' | 'signup'>('signin');
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
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[380px] gap-6 px-4">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <h1 className="text-3xl font-bold">
              {formType === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-balance text-muted-foreground">
              {formType === 'signin'
                ? 'Insira seus dados para acessar o universo GYMSTORE'
                : 'Preencha os campos para começar sua jornada'}
            </p>
          </div>
          
          <div className="grid gap-4">
            {formType === 'signin' ? <SignInForm /> : <SignUpForm />}
          </div>
          
          {formType === 'signin' && (
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
          )}

          <SocialLoginButton />

          <div className="mt-4 text-center text-sm">
            {formType === 'signin' ? (
              <>
                Não tem uma conta?{" "}
                <button onClick={() => setFormType('signup')} className="underline font-semibold">
                  Registrar
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{" "}
                <button onClick={() => setFormType('signin')} className="underline font-semibold">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1583454110551-21f2fa2a8a14?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Pessoa se exercitando em uma academia"
          className="h-screen w-full object-cover"
        />
      </div>
    </div>
  );
}