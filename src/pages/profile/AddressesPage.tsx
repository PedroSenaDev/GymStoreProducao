import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Address } from "@/types/address";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, MoreVertical, Trash2, Edit, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { showError, showSuccess } from "@/utils/toast";
import AddressForm from "./AddressForm";

async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export default function AddressesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const session = useSessionStore((state) => state.session);
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  const { mutate: deleteAddress } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Endereço excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
    },
    onError: (error) => showError(error.message),
  });

  const handleEdit = (address: Address) => {
    setSelectedAddress(address);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAddress(undefined);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAddressToDelete(id);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (addressToDelete) {
      deleteAddress(addressToDelete);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 className="text-lg font-medium">Meus Endereços</h3>
                <p className="text-sm text-muted-foreground">
                    Gerencie seus endereços de entrega.
                </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleAddNew} className="mt-4 sm:mt-0 w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Novo
                    </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] rounded-md sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                    <DialogTitle>{selectedAddress ? "Editar" : "Adicionar"} Endereço</DialogTitle>
                    </DialogHeader>
                    <AddressForm
                    address={selectedAddress}
                    onFinished={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : addresses && addresses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1">
            {addresses.map((address) => (
              <Card key={address.id}>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <CardTitle className="text-base leading-tight">
                                    {address.street}, {address.number || 'S/N'}
                                </CardTitle>
                                {address.is_default && <Badge>Padrão</Badge>}
                            </div>
                            <CardDescription>
                                {address.neighborhood} - {address.city}, {address.state}
                            </CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(address)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(address.id)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Home className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum endereço cadastrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para futuras compras.</p>
          </div>
        )}

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O endereço será excluído permanentemente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete}>
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}