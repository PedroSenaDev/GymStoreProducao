import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Address } from "@/types/address";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusCircle, MapPin, AlertCircle, Search, Truck } from "lucide-react";
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
import { showError } from "@/utils/toast";
import { useCartStore } from "@/store/cartStore";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";

interface ShippingOption {
  id: string | number;
  name: string;
  price: number;
  delivery_time: string | number;
  type: 'fixed' | 'gateway';
  company: {
    name: string;
    picture: string | null;
  };
}

interface AddressStepProps {
  selectedAddressId: string | null;
  onAddressSelect: (id: string | null) => void;
  onShippingChange: (cost: number, rateId: string | number, rateName: string, deliveryTime: string | number) => void;
}

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

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function AddressStep({ selectedAddressId, onAddressSelect, onShippingChange }: AddressStepProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  const session = useSessionStore((state) => state.session);
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { items } = useCartStore();
  const selectedItems = items.filter(item => item.selected);

  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (addresses) {
      const defaultAddress = addresses.find(a => a.is_default);
      if (defaultAddress && !selectedAddressId) {
        onAddressSelect(defaultAddress.id);
        setZipCode(defaultAddress.zip_code);
      }
    }
  }, [addresses, onAddressSelect, selectedAddressId]);

  const handleQuoteShipping = async () => {
    if (!zipCode || zipCode.replace(/\D/g, '').length !== 8) {
      showError("Por favor, insira um CEP válido.");
      return;
    }
    setIsLoadingQuote(true);
    setQuoteError(null);
    setShippingOptions([]);
    setSelectedRateId(null);
    onShippingChange(0, '', '', '');

    try {
      const { data, error } = await supabase.functions.invoke('quote-shipping', {
        body: { cartItems: selectedItems, zipCode },
      });
      if (error || data.error) throw new Error(error?.message || data.error);
      
      if (data && data.length === 0) {
        setQuoteError("Nenhuma opção de frete encontrada para este CEP. Verifique o CEP ou tente novamente mais tarde.");
      } else {
        setShippingOptions(data);
      }
    } catch (err: any) {
      setQuoteError("Não foi possível calcular o frete. Verifique o CEP e tente novamente.");
      showError(err.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleRateSelection = (rateId: string) => {
    const selectedRate = shippingOptions.find(r => r.id.toString() === rateId);
    if (selectedRate) {
      setSelectedRateId(rateId);
      onShippingChange(selectedRate.price, selectedRate.id, `${selectedRate.company.name} - ${selectedRate.name}`, selectedRate.delivery_time);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">1. Endereço de Entrega</h3>
          {isLoadingAddresses ? <Loader2 className="animate-spin" /> : (
            <>
              <RadioGroup value={selectedAddressId || ""} onValueChange={id => { onAddressSelect(id); setZipCode(addresses?.find(a => a.id === id)?.zip_code || ""); setShippingOptions([]); setSelectedRateId(null); onShippingChange(0, '', '', ''); }}>
                {addresses?.map((address) => (
                  <Label key={address.id} htmlFor={`address-${address.id}`} className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary">
                    <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mr-4 mt-1" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">{address.street}, {address.number || 'S/N'}</p>
                      <p className="text-muted-foreground">{address.neighborhood} - {address.city}, {address.state}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
              <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Endereço</Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] rounded-md sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Adicionar Novo Endereço</DialogTitle></DialogHeader>
                  <AddressForm onFinished={() => { setFormOpen(false); queryClient.invalidateQueries({ queryKey: ["addresses", userId] }); }} />
                </DialogContent>
              </Dialog>
              {!addresses?.length && <div className="text-center py-4"><MapPin className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Adicione um endereço para continuar.</p></div>}
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">2. Opções de Frete</h3>
          <div className="flex flex-col sm:flex-row items-start gap-2">
            <Input placeholder="Digite seu CEP" value={zipCode} onChange={(e) => setZipCode(e.target.value)} disabled={!selectedAddressId} className="flex-1" />
            <Button onClick={handleQuoteShipping} disabled={!selectedAddressId || isLoadingQuote} className="w-full sm:w-auto">
              {isLoadingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Calcular Frete
            </Button>
          </div>

          {quoteError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{quoteError}</AlertDescription></Alert>}

          {shippingOptions.length > 0 && (
            <RadioGroup value={selectedRateId || ""} onValueChange={handleRateSelection} className="space-y-4 pt-4">
              {shippingOptions.map((rate) => (
                <Label key={rate.id} htmlFor={`rate-${rate.id}`} className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary">
                  <RadioGroupItem value={rate.id.toString()} id={`rate-${rate.id}`} className="mr-4 mt-1" />
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {rate.company.picture ? (
                        <img src={rate.company.picture} alt={rate.company.name} className="h-6 w-auto" />
                      ) : (
                        <Truck className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold">{rate.company.name}</p>
                        <p className="text-xs text-muted-foreground">{rate.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{rate.price === 0 ? 'Grátis' : formatCurrency(rate.price)}</p>
                      {rate.type === 'gateway' && <p className="text-xs text-muted-foreground">{rate.delivery_time} dias</p>}
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}
        </div>
      </CardContent>
    </Card>
  );
}