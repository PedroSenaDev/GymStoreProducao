import { useSession } from "@/context/SessionContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const Index = () => {
  const { session, profile, logout } = useSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Você está logado como:</p>
          <div className="p-4 bg-muted rounded-md">
            <p><strong>Email:</strong> {session.user.email}</p>
            {profile && (
              <>
                <p><strong>Nome:</strong> {profile.full_name}</p>
                <p><strong>CPF:</strong> {profile.cpf}</p>
                <p><strong>Telefone:</strong> {profile.phone}</p>
              </>
            )}
          </div>
          {profile?.isAdmin && (
            <Button asChild className="w-full">
              <Link to="/admin">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Acessar Painel Admin
              </Link>
            </Button>
          )}
          <Button onClick={logout} className="w-full" variant="outline">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;