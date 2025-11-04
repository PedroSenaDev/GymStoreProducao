import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { FixedShippingRate } from "@/types/fixedShippingRate";
import { useCartStore } from "@/store/cartStore";

async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function fetchFixedShippingRates(): Promise<FixedShippingRate[]> {
    const { data, error } = await supabase
      .from('fixed_shipping_rates')
      .select('*')
      .eq('is_active', true)
      .order('min_order_value', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AddressStepProps {
  selectedAddressId: string | null;
  onAddressSelect: (id: string | null) => void;
  selectedRateId: string | null;
  onRateSelect: (rateId: string | null) => void;
  onShippingChange: (cost: number, rateId: string | null) => void;
}

export function AddressStep({ selectedAddressId, onAddressSelect, selectedRateId, onRateSelect, onShippingChange }: AddressStepProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { items } = useCartStore();

  const subtotal = items
    .filter(item => item.selected)
    .reduce((acc, item) => acc + item.price * item.quantity, 0);

  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  const { data: rates, isLoading: isLoadingRates } = useQuery({
    queryKey: ["fixedShippingRates"],
    queryFn: fetchFixedShippingRates,
  });

  // Efeito para calcular o frete quando a taxa ou o subtotal muda
  useEffect(() => {
    if (isLoadingRates || !rates) return;

    const rate = rates.find(r => r.id === selectedRateId);
    
    if (rate) {
        if (subtotal >= rate.min_order_value) {
            onShippingChange(rate.price, rate.id);
        } else {
            // Se a taxa selecionada não atende mais ao valor mínimo, deseleciona
            onRateSelect(null);
            onShippingChange(0, null);
        }
    } else {
        onShippingChange(0, null);
    }
  }, [selectedRateId, rates, subtotal, onShippingChange, onRateSelect, isLoadingRates]);

  // Efeito para selecionar a taxa mais barata automaticamente (ou a única)
  useEffect(() => {
    if (isLoadingRates || !rates || rates.length === 0 || selectedRateId) return;

    // Tenta encontrar a taxa mais barata que o subtotal atende
    const bestRate = rates
        .filter(r => subtotal >= r.min_order_value)
        .sort((a, b) => a.price - b.price)[0];

    if (bestRate) {
        onRateSelect(bestRate.id);
    }
  }, [rates, subtotal, selectedRateId, onRateSelect, isLoadingRates]);


  if (isLoadingAddresses || isLoadingRates) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const availableRates = rates?.filter(r => subtotal >= r.min_order_value) || [];

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Seleção de Endereço */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selecione o Endereço de Entrega</h3>
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
                    <AddressForm onFinished={() => { setFormOpen(false); queryClient.invalidateQueries({ queryKey: ["addresses", userId] }); }} />
                </DialogContent>
            </Dialog>

            {!isLoadingAddresses && addresses?.length === 0 && (
                <div className="text-center py-10">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum endereço cadastrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para continuar.</p>
                </div>
            )}
        </div>

        {/* Seleção de Frete */}
        <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Selecione a Opção de Frete</h3>
            {availableRates.length > 0 ? (
                <RadioGroup
                    value={selectedRateId || ""}
                    onValueChange={onRateSelect}
                    className="space-y-4"
                >
                    {availableRates.map((rate) => (
                        <Label
                            key={rate.id}
                            htmlFor={`rate-${rate.id}`}
                            className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary"
                        >
                            <RadioGroupItem value={rate.id} id={`rate-${rate.id}`} className="mr-4 mt-1" />
                            <div className="flex-1 text-sm">
                                <p className="font-semibold">{rate.label}</p>
                                <p className="text-muted-foreground">
                                    {rate.price === 0 ? 'Grátis' : formatCurrency(rate.price)}
                                </p>
                                {rate.min_order_value > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        (Disponível para pedidos acima de {formatCurrency(rate.min_order_value)})
                                    </p>
                                )}
                            </div>
                        </Label>
                    ))}
                </RadioGroup>
            ) : (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Nenhuma opção de frete disponível. Verifique se há taxas ativas no painel de administração.
                    </AlertDescription>
                </Alert>
            )}
        </div>
      </CardContent>
    </Card>
  );
}