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
import { Input } from "@/components/ui/input";
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

async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

interface AddressStepProps {
  selectedAddressId: string | null;
  onAddressSelect: (id: string) => void;
  onShippingCostChange: (cost: number, zoneId: string | null) => void;
}

export function AddressStep({ selectedAddressId, onAddressSelect, onShippingCostChange }: AddressStepProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [distance, setDistance] = useState("");
  const [debouncedDistance, setDebouncedDistance] = useState("");
  const [shippingError, setShippingError] = useState<string | null>(null);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDistance(distance);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [distance]);

  useEffect(() => {
    const getFee = async () => {
      if (debouncedDistance && parseFloat(debouncedDistance) > 0) {
        setShippingError(null);
        const { data, error } = await supabase.rpc('get_shipping_fee', { distance: parseFloat(debouncedDistance) });
        
        if (error || !data || data.length === 0) {
          onShippingCostChange(0, null);
          setShippingError("Não foi possível encontrar uma taxa de frete para esta distância.");
        } else {
          onShippingCostChange(data[0].price, data[0].zone_id);
        }
      } else {
        onShippingCostChange(0, null);
        setShippingError(null);
      }
    };
    getFee();
  }, [debouncedDistance, onShippingCostChange]);

  if (isLoading) {
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

        {!isLoading && addresses?.length === 0 && (
            <div className="text-center py-10">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum endereço cadastrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para continuar.</p>
            </div>
        )}

        <div>
          <Label htmlFor="distance">Distância de Entrega (KM)</Label>
          <Input
            id="distance"
            type="number"
            placeholder="Ex: 7.5"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="mt-2"
          />
          {shippingError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{shippingError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}