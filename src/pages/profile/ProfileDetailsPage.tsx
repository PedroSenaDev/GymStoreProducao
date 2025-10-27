import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useSessionStore } from "@/store/sessionStore";
import { Link } from "react-router-dom";
import { LogOut, LayoutDashboard, Edit, Loader2 } from "lucide-react";
import ProfileDetailsForm from "./ProfileDetailsForm";
import { Separator } from "@/components/ui/separator";

const ProfileInfo = ({ label, value }: { label: string, value?: string }) => (
    <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm">{value || '-'}</dd>
    </div>
);

export default function ProfileDetailsPage() {
  const { data: profile, isLoading } = useProfile();
  const { logout } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-medium">Meu Perfil</h3>
            <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais e configurações da conta.
            </p>
        </div>
        <Separator />
        {isEditing && profile ? (
            <ProfileDetailsForm profile={profile} onFinished={() => setIsEditing(false)} />
        ) : (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Informações Pessoais</CardTitle>
                        <CardDescription className="text-xs">Seus dados cadastrais</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Editar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ProfileInfo label="Nome Completo" value={profile?.full_name} />
                    <Separator />
                    <ProfileInfo label="Email" value={useSessionStore.getState().session?.user.email} />
                    <Separator />
                    <ProfileInfo label="CPF" value={profile?.cpf} />
                    <Separator />
                    <ProfileInfo label="Telefone" value={profile?.phone} />
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                    {profile?.isAdmin && (
                    <Button asChild variant="outline" size="sm">
                        <Link to="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Painel Admin
                        </Link>
                    </Button>
                    )}
                    <Button variant="destructive" onClick={logout} size="sm" className="sm:ml-auto">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                    </Button>
                </CardFooter>
            </Card>
        )}
    </div>
  );
}