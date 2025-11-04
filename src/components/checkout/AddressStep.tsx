import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Address } from "@/types/address";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusCircle, MapPin, AlertCircle, Truck } from "lucide-react";
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
import { ShippingOption } from "@/types/shipping";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

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
    // PGRST116 = linha não encontrada (CEP não configurado)
    if (error && error.code !== 'PGRST116') throw error; 
    if (!data?.value) {
        // Lançar um erro específico para ser capturado no useQuery
        throw new Error("CEP_NOT_CONFIGURED"); 
    }
    return data.value;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AddressStepProps {
  selectedAddressId: string | null;
  onAddressSelect: (id: string | null) => void;
  // Nova função de callback para frete: retorna o custo, o ID do serviço e o prazo
  onShippingChange: (cost: number, serviceId: string | null, serviceName: string | null) => void;
}

export function AddressStep({ selectedAddressId, onAddressSelect, onShippingChange }: AddressStepProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState<string | null>(null);
  
  const session = useSessionStore((state) => state.session);
  const { items: cartItems } = useCartStore();
  const selectedCartItems = cartItems.filter(item => item.selected);
  
  const userId = session?.user.id;
  const lastCalculatedAddressId = useRef<string | null>(null);

  const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => fetchAddresses(userId!),
    enabled: !!userId,
  });

  const { data: storeCep, isLoading: isLoadingStoreCep, isError: isStoreCepError, error: storeCepQueryError } = useQuery({
    queryKey: ["storeCep"],
    queryFn: fetchStoreCep,
    retry: false, // Não tentar novamente se o CEP não estiver configurado
  });

  // Efeito para calcular o frete quando o endereço ou o CEP da loja mudar
  useEffect(() => {
    const quoteShipping = async () => {
      if (storeCepQueryError?.message === "CEP_NOT_CONFIGURED") {
        setShippingError("O CEP de origem da loja não está configurado. Contate o administrador.");
        setShippingOptions([]);
        onShippingChange(0, null, null);
        return;
      }

      if (!selectedAddressId || !addresses || !storeCep || selectedCartItems.length === 0) {
        setShippingOptions([]);
        setSelectedShippingOption(null);
        onShippingChange(0, null, null);
        lastCalculatedAddressId.current = null;
        return;
      }

      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) return;

      // Se o endereço for o mesmo e já tivermos opções, não recalculamos
      if (selectedAddressId === lastCalculatedAddressId.current && shippingOptions.length > 0) {
        return;
      }

      setIsCalculating(true);
      setShippingError(null);
      setShippingOptions([]);
      setSelectedShippingOption(null);
      onShippingChange(0, null, null);

      try {
        const itemsPayload = selectedCartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
        }));

        const { data: optionsData, error: quoteError } = await supabase.functions.invoke('quote-shipping', {
          body: {
            destinationCep: selectedAddress.zip_code.replace(/\D/g, ''),
            storeCep: storeCep,
            items: itemsPayload,
          },
        });
        
        if (quoteError) {
            throw new Error(quoteError.message);
        }
        
        if (optionsData.error) {
            throw new Error(optionsData.error);
        }

        setShippingOptions(optionsData as ShippingOption[]);
        lastCalculatedAddressId.current = selectedAddressId;

        // Seleciona a opção mais barata por padrão
        if (optionsData.length > 0) {
            const cheapestOption = optionsData.reduce((prev: ShippingOption, current: ShippingOption) => 
                (prev.price < current.price ? prev : current)
            );
            setSelectedShippingOption(cheapestOption.id);
            onShippingChange(cheapestOption.price, cheapestOption.id, cheapestOption.name);
        } else {
            setShippingError("Nenhuma opção de frete encontrada para este endereço.");
        }

      } catch (err: any) {
        const errorMessage = err.message || "Erro desconhecido ao cotar o frete.";
        showError(errorMessage);
        setShippingError(errorMessage);
        onShippingChange(0, null, null);
        lastCalculatedAddressId.current = null;
      } finally {
        setIsCalculating(false);
      }
    };

    quoteShipping();
  }, [selectedAddressId, addresses, storeCep, selectedCartItems, onShippingChange, storeCepQueryError]);

  // Efeito para atualizar o custo de frete quando a opção de frete for alterada
  useEffect(() => {
    if (selectedShippingOption && shippingOptions.length > 0) {
        const option = shippingOptions.find(opt => opt.id === selectedShippingOption);
        if (option) {
            onShippingChange(option.price, option.id, option.name);
        }
    }
  }, [selectedShippingOption, shippingOptions, onShippingChange]);


  if (isLoadingAddresses || isLoadingStoreCep) {
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
        {/* Seleção de Endereço */}
        <h3 className="font-semibold text-base">Selecione o Endereço de Entrega</h3>
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

        {/* Opções de Frete */}
        <div className={cn("space-y-4 pt-4", !selectedAddressId && "opacity-50 pointer-events-none")}>
            <h3 className="font-semibold text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Opções de Frete</h3>
            
            {isStoreCepError && storeCepQueryError?.message === "CEP_NOT_CONFIGURED" && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Erro de configuração: O CEP de origem da loja não está configurado. Por favor, configure-o no Painel Admin &gt; Configurações &gt; Frete.
                    </AlertDescription>
                </Alert>
            )}

            {isCalculating ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground p-4 border rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cotando frete com transportadoras...</span>
                </div>
            ) : shippingOptions.length > 0 ? (
                <RadioGroup
                    value={selectedShippingOption || ""}
                    onValueChange={setSelectedShippingOption}
                    className="space-y-3"
                >
                    {shippingOptions.map((option) => (
                        <Label
                            key={option.id}
                            htmlFor={`shipping-${option.id}`}
                            className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary"
                        >
                            <RadioGroupItem value={option.id} id={`shipping-${option.id}`} className="mr-4 mt-1" />
                            <div className="flex-1 text-sm">
                                <p className="font-semibold">{option.name}</p>
                                <p className="text-muted-foreground">Prazo: {option.delivery_time} dia(s) útil(eis)</p>
                            </div>
                            <p className="font-bold text-right">{formatCurrency(option.price)}</p>
                        </Label>
                    ))}
                </RadioGroup>
            ) : shippingError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{shippingError}</AlertDescription>
                </Alert>
            ) : (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Selecione um endereço para cotar as opções de frete.
                    </AlertDescription>
                </Alert>
            )}
        </div>

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