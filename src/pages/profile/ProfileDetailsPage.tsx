import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useSessionStore } from "@/store/sessionStore";
import { Link } from "react-router-dom";
import { LogOut, LayoutDashboard, Edit, Loader2 } from "lucide-react";
import ProfileDetailsForm from "./ProfileDetailsForm";

const ProfileInfo = ({ label, value }: { label: string, value?: string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
        <dt className="font-medium text-muted-foreground">{label}</dt>
        <dd className="col-span-2">{value || '-'}</dd>
    </div>
);

export default function ProfileDetailsPage() {
  const { data: profile, isLoading } = useProfile();
  const { logout } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>
                    Gerencie suas informações pessoais e configurações da conta.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>
                    Gerencie suas informações pessoais e configurações da conta.
                </CardDescription>
            </div>
            {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing && profile ? (
            <ProfileDetailsForm profile={profile} onFinished={() => setIsEditing(false)} />
        ) : (
            <dl className="space-y-4">
                <ProfileInfo label="Nome Completo" value={profile?.full_name} />
                <ProfileInfo label="Email" value={useSessionStore.getState().session?.user.email} />
                <ProfileInfo label="CPF" value={profile?.cpf} />
                <ProfileInfo label="Telefone" value={profile?.phone} />
            </dl>
        )}
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