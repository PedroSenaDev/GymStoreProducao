import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useSessionStore } from "@/store/sessionStore";
import { LogOut, Edit, Loader2 } from "lucide-react";
import ProfileDetailsForm from "./ProfileDetailsForm";
import { Separator } from "@/components/ui/separator";

const ProfileInfo = ({ label, value }: { label: string, value?: string }) => (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
        <dt className="font-medium text-muted-foreground">{label}</dt>
        <dd className="sm:col-span-2">{value || '-'}</dd>
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
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Informações Pessoais</CardTitle>
                        <CardDescription>Seus dados cadastrais</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="self-start sm:self-auto">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                </CardHeader>
                <CardContent className="divide-y">
                    <ProfileInfo label="Nome Completo" value={profile?.full_name} />
                    <ProfileInfo label="Email" value={useSessionStore.getState().session?.user.email} />
                    <ProfileInfo label="CPF" value={profile?.cpf} />
                    <ProfileInfo label="Telefone" value={profile?.phone} />
                </CardContent>
                <CardFooter className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6">
                    <Button variant="destructive" onClick={logout} size="sm" className="w-full sm:w-auto">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </CardFooter>
            </Card>
        )}
    </div>
  );
}