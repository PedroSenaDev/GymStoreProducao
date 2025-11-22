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
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Edit, Trash2, Truck } from "lucide-react";
import PolicyForm from "./PolicyForm";
import AboutUsForm from "./AboutUsForm";
import SizeChartForm from "./SizeChartForm";
import { showError, showSuccess } from "@/utils/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import FooterSettingsForm from "./FooterSettingsForm";

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
  const [activeTab, setActiveTab] = useState("general");
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isAboutUsDialogOpen, setIsAboutUsDialogOpen] = useState(false);
  const [isSizeChartDialogOpen, setIsSizeChartDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | undefined>(undefined);
  const [selectedSizeChart, setSelectedSizeChart] = useState<SizeChart | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: policies, isLoading: isLoadingPolicies } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });
  const { data: aboutUsPolicy, isLoading: isLoadingAboutUs } = useQuery({ queryKey: ["aboutUsPolicy"], queryFn: fetchAboutUsPolicy });
  const { data: sizeCharts, isLoading: isLoadingSizeCharts } = useQuery({ queryKey: ["sizeCharts"], queryFn: fetchSizeCharts });

  const { mutate: deletePolicy } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Política excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: (error: any) => showError(error.message),
  });

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações do Site</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-4 max-w-sm">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma seção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="shipping">Frete</SelectItem>
                <SelectItem value="size-charts">Tabelas de Medidas</SelectItem>
                <SelectItem value="policies">Políticas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="general" className="mt-6 space-y-6">
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
                              Editar Seção Sobre
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
                <CardTitle>Informações de Contato do Rodapé</CardTitle>
                <CardDescription>Configure o e-mail e telefone que aparecem no rodapé do site.</CardDescription>
              </CardHeader>
              <CardContent>
                <FooterSettingsForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Frete Fixo</CardTitle>
                <CardDescription>Gerencie as taxas de frete fixas baseadas no valor do pedido.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/admin/settings/shipping">
                    <Truck className="mr-2 h-4 w-4" />
                    Configurar Taxas Fixas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="size-charts" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Tabelas de Medidas</CardTitle>
                    <CardDescription className="pt-1.5">Gerencie as tabelas de medidas dos produtos.</CardDescription>
                  </div>
                  <Dialog open={isSizeChartDialogOpen} onOpenChange={setIsSizeChartDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddNewSizeChart} size="sm" className="w-full flex-shrink-0 md:w-auto">
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
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Políticas do Site</CardTitle>
                    <CardDescription className="pt-1.5">Gerencie as políticas de privacidade, troca, etc.</CardDescription>
                  </div>
                  <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddNewPolicy} size="sm" className="w-full flex-shrink-0 md:w-auto">
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
                      <CardTitle className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between text-lg">
                        <span className="break-words pr-2">{policy.title}</span>
                        <div className="flex items-center self-end md:self-center flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPolicy(policy)}>
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
                                          Esta ação não pode ser desfeita. A política será excluída permanentemente.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deletePolicy(policy.id)}>
                                          Excluir
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}