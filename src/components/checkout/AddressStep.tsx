import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Address } from "@/types/address";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusCircle, MapPin, AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddressForm from "@/pages/profile/AddressForm";
import { Skeleton } from "../ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";

async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function fetchStoreCep(): Promise<string> {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'store_cep').single();
    if (error || !data?.value) {
        throw new Error("CEP de origem da loja não configurado.");
    }
    return data.value;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AddressStepProps {
  selectedAddressId: string | null;
  onAddressSelect: (id: string | null) => void;
  onShippingChange: (cost: number, distance: number, zoneId: string | null) => void;
}

export function AddressStep({ selectedAddressId, onAddressSelect, onShippingChange }: AddressStepProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;

  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  const { data: storeCep } = useQuery({
    queryKey: ["storeCep"],
    queryFn: fetchStoreCep,
  });

  useEffect(() => {
    const calculateShipping = async () => {
      if (!selectedAddressId || !addresses || !storeCep) {
        onShippingChange(0, 0, null);
        return;
      }

      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) return;

      setIsCalculating(true);
      setShippingError(null);

      try {
        // 1. Calculate distance using the free OpenStreetMap function
        const { data: distanceData, error: distanceError } = await supabase.functions.invoke('calculate-distance', {
          body: {
            destinationCep: selectedAddress.zip_code.replace(/\D/g, ''),
          },
        });
        if (distanceError || distanceData.error) throw new Error(distanceError?.message || distanceData.error);
        const distance = parseFloat(distanceData.distance);

        // 2. Get shipping fee based on distance
        const { data: feeData, error: feeError } = await supabase.rpc('get_shipping_fee', { distance });
        if (feeError || !feeData || feeData.length === 0) {
          throw new Error("Não foi possível encontrar uma taxa de frete para este endereço. Pode estar fora da nossa área de entrega.");
        }
        
        const shippingCost = feeData[0].price;
        onShippingChange(shippingCost, distance, feeData[0].zone_id);
        showSuccess(`Frete calculado: ${formatCurrency(shippingCost)}`);

      } catch (err: any) {
        showError(err.message);
        setShippingError(err.message);
        onShippingChange(0, 0, null);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateShipping();
  }, [selectedAddressId, addresses, storeCep, onShippingChange]);

  if (isLoadingAddresses) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <RadioGroup
          value={selectedAddressId || ""}
          onValueChange={onAddressSelect}
          className="space-y-4"
        >
          {addresses?.map((address) => (
            <Label
              key={address.id}
              htmlFor={`address-${address.id}`}
              className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary"
            >
              <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mr-4 mt-1" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {address.street}, {address.number || 'S/N'}
                </p>
                <p className="text-muted-foreground">
                  {address.neighborhood} - {address.city}, {address.state}
                </p>
                <p className="text-muted-foreground">CEP: {address.zip_code}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Novo Endereço
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] rounded-md sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Endereço</DialogTitle>
            </DialogHeader>
            <AddressForm onFinished={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>

        {isCalculating && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculando frete...</span>
          </div>
        )}

        {shippingError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{shippingError}</AlertDescription>
          </Alert>
        )}

        {!isLoadingAddresses && addresses?.length === 0 && (
            <div className="text-center py-10">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum endereço cadastrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para continuar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}