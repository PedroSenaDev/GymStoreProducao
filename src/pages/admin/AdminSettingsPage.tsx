import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Policy } from "@/types/policy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit } from "lucide-react";
import PolicyForm from "./PolicyForm";
import AboutUsForm from "./AboutUsForm";

async function fetchPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase.from("policies").select("*").not('display_area', 'eq', 'about_us').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function fetchAboutUsPolicy(): Promise<Policy | null> {
    const { data, error } = await supabase.from("policies").select("*").eq('display_area', 'about_us').maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

export default function AdminSettingsPage() {
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isAboutUsDialogOpen, setIsAboutUsDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | undefined>(undefined);

  const { data: policies, isLoading: isLoadingPolicies } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
  });

  const { data: aboutUsPolicy, isLoading: isLoadingAboutUs } = useQuery({
    queryKey: ["aboutUsPolicy"],
    queryFn: fetchAboutUsPolicy,
  });

  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsPolicyDialogOpen(true);
  };

  const handleAddNewPolicy = () => {
    setSelectedPolicy(undefined);
    setIsPolicyDialogOpen(true);
  };

  const isLoading = isLoadingPolicies || isLoadingAboutUs;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configurações do Site</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Seção "Sobre Nossa Loja"</CardTitle>
              <CardDescription>Edite o título e o texto que aparecem na página inicial.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isAboutUsDialogOpen} onOpenChange={setIsAboutUsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Seção
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Seção "Sobre"</DialogTitle>
                        </DialogHeader>
                        <AboutUsForm
                            policy={aboutUsPolicy || undefined}
                            onFinished={() => setIsAboutUsDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Políticas do Site</CardTitle>
                  <CardDescription className="pt-1.5">Gerencie as políticas de privacidade, troca, etc.</CardDescription>
                </div>
                <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddNewPolicy} size="sm" className="w-full flex-shrink-0 sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Política
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{selectedPolicy ? "Editar" : "Adicionar"} Política</DialogTitle>
                    </DialogHeader>
                    <PolicyForm
                      policy={selectedPolicy}
                      onFinished={() => setIsPolicyDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {policies?.map((policy) => (
                <Card key={policy.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      {policy.title}
                      <Button variant="ghost" size="icon" onClick={() => handleEditPolicy(policy)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription className="line-clamp-3 break-words">
                      {policy.content}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}