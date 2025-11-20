import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FixedShippingRate } from "@/types/fixedShippingRate";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, PlusCircle, MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showError, showSuccess } from "@/utils/toast";
import FixedShippingRateForm from "./FixedShippingRateForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

async function fetchFixedShippingRates(): Promise<FixedShippingRate[]> {
  const { data, error } = await supabase.from("fixed_shipping_rates").select("*").order('min_order_value');
  if (error) throw new Error(error.message);
  return data;
}

export default function AdminFixedShippingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<FixedShippingRate | undefined>(undefined);
  const [rateToDelete, setRateToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: rates, isLoading } = useQuery({
    queryKey: ["fixedShippingRates"],
    queryFn: fetchFixedShippingRates,
  });

  const { mutate: deleteRate } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_shipping_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Taxa de frete excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fixedShippingRates"] });
    },
    onError: (error: any) => showError(error.message),
  });

  const handleEdit = (rate: FixedShippingRate) => {
    setSelectedRate(rate);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedRate(undefined);
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link to="/admin/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Configurações
        </Link>
      </Button>
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Taxas de Frete Fixas</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Taxa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedRate ? "Editar" : "Adicionar"} Taxa de Frete</DialogTitle>
            </DialogHeader>
            <FixedShippingRateForm
              rate={selectedRate}
              onFinished={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor Mínimo do Pedido</TableHead>
                  <TableHead>Valor do Frete</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.label}</TableCell>
                    <TableCell>{formatCurrency(rate.min_order_value)}</TableCell>
                    <TableCell>{formatCurrency(rate.price)}</TableCell>
                    <TableCell>
                        <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                            {rate.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(rate)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setRateToDelete(rate.id)} className="text-red-500">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!rateToDelete} onOpenChange={(open) => !open && setRateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A taxa de frete será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(rateToDelete) deleteRate(rateToDelete) }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}