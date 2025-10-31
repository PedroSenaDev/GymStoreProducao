import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShippingZone } from "@/types/shipping";
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
import { Loader2, PlusCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showError, showSuccess } from "@/utils/toast";
import ShippingZoneForm from "./ShippingZoneForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchShippingZones(): Promise<ShippingZone[]> {
  const { data, error } = await supabase.from("shipping_zones").select("*").order('min_km');
  if (error) throw new Error(error.message);
  return data;
}

export default function AdminShippingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | undefined>(undefined);
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: zones, isLoading } = useQuery({
    queryKey: ["shippingZones"],
    queryFn: fetchShippingZones,
  });

  const { mutate: deleteZone } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Faixa de frete excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["shippingZones"] });
    },
    onError: (error: any) => showError(error.message),
  });

  const handleEdit = (zone: ShippingZone) => {
    setSelectedZone(zone);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedZone(undefined);
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Configurar Frete por KM</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Faixa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedZone ? "Editar" : "Adicionar"} Faixa de Frete</DialogTitle>
            </DialogHeader>
            <ShippingZoneForm
              zone={selectedZone}
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
                  <TableHead>Distância Mínima (KM)</TableHead>
                  <TableHead>Distância Máxima (KM)</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones?.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.label || '-'}</TableCell>
                    <TableCell>{zone.min_km} km</TableCell>
                    <TableCell>{zone.max_km} km</TableCell>
                    <TableCell>{formatCurrency(zone.price)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(zone)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setZoneToDelete(zone.id)} className="text-red-500">Excluir</DropdownMenuItem>
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

      <AlertDialog open={!!zoneToDelete} onOpenChange={(open) => !open && setZoneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A faixa de frete será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(zoneToDelete) deleteZone(zoneToDelete) }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}