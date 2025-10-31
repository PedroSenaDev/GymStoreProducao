import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Policy } from "@/types/policy";
import { SizeChart } from "@/types/sizeChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import PolicyForm from "./PolicyForm";
import AboutUsForm from "./AboutUsForm";
import SizeChartForm from "./SizeChartForm";
import { showError, showSuccess } from "@/utils/toast";

async function fetchPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase.from("policies").select("*").not('display_area', 'eq', 'about_us').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchAboutUsPolicy(): Promise<Policy | null> {
    const { data, error } = await supabase.from("policies").select("*").eq('display_area', 'about_us').maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

async function fetchSizeCharts(): Promise<SizeChart[]> {
    const { data, error } = await supabase.from("size_charts").select("*").order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

export default function AdminSettingsPage() {
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isAboutUsDialogOpen, setIsAboutUsDialogOpen] = useState(false);
  const [isSizeChartDialogOpen, setIsSizeChartDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | undefined>(undefined);
  const [selectedSizeChart, setSelectedSizeChart] = useState<SizeChart | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: policies, isLoading: isLoadingPolicies } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });
  const { data: aboutUsPolicy, isLoading: isLoadingAboutUs } = useQuery({ queryKey: ["aboutUsPolicy"], queryFn: fetchAboutUsPolicy });
  const { data: sizeCharts, isLoading: isLoadingSizeCharts } = useQuery({ queryKey: ["sizeCharts"], queryFn: fetchSizeCharts });

  const { mutate: deleteSizeChart } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("size_charts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Tabela de medidas excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["sizeCharts"] });
    },
    onError: (error: any) => showError(error.message),
  });

  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsPolicyDialogOpen(true);
  };
  const handleAddNewPolicy = () => {
    setSelectedPolicy(undefined);
    setIsPolicyDialogOpen(true);
  };
  const handleEditSizeChart = (chart: SizeChart) => {
    setSelectedSizeChart(chart);
    setIsSizeChartDialogOpen(true);
  };
  const handleAddNewSizeChart = () => {
    setSelectedSizeChart(undefined);
    setIsSizeChartDialogOpen(true);
  };

  const isLoading = isLoadingPolicies || isLoadingAboutUs || isLoadingSizeCharts;

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
                  <CardTitle>Tabelas de Medidas</CardTitle>
                  <CardDescription className="pt-1.5">Gerencie as tabelas de medidas dos produtos.</CardDescription>
                </div>
                <Dialog open={isSizeChartDialogOpen} onOpenChange={setIsSizeChartDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddNewSizeChart} size="sm" className="w-full flex-shrink-0 sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Tabela
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{selectedSizeChart ? "Editar" : "Adicionar"} Tabela de Medidas</DialogTitle>
                    </DialogHeader>
                    <SizeChartForm
                      sizeChart={selectedSizeChart}
                      onFinished={() => setIsSizeChartDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sizeCharts?.map((chart) => (
                <Card key={chart.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{chart.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex items-center justify-center">
                    <img src={chart.image_url} alt={chart.title} className="max-h-32 rounded-md" />
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEditSizeChart(chart)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A tabela será excluída e desvinculada de todos os produtos.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSizeChart(chart.id)}>
                                    Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
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
                    <CardDescription className="line-clamp-3 break-all">
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