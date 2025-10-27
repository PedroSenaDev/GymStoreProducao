import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useSessionStore } from "@/store/sessionStore";
import { Link } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";

export default function ProfileDetailsPage() {
  const { data: profile } = useProfile();
  const { logout } = useSessionStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e configurações da conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Em breve: aqui você poderá editar suas informações pessoais.</p>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {profile?.isAdmin && (
          <Button asChild variant="outline">
            <Link to="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Painel Admin
            </Link>
          </Button>
        )}
        <Button variant="destructive" onClick={logout} className="sm:ml-auto">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </CardFooter>
    </Card>
  );
}