import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy, AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useSessionStore } from "@/store/sessionStore";
import { useProfile } from "@/hooks/useProfile";
import { Label } from "../ui/label";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";

interface PixData {
  qr_code_url: string;
  br_code: string;
  pix_charge_id: string;
}

interface PixInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  items: CartItem[];
  selectedAddressId: string | null;
  paymentMethod: string | null;
  shippingCost: number;
  shippingRate: { id: string | number; name: string; } | null;
  deliveryTime: string | number | null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function PixInformationDialog({ open, onOpenChange, totalAmount, items, selectedAddressId, paymentMethod, shippingCost, shippingRate, deliveryTime }: PixInformationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const session = useSessionStore((state) => state.session);
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  const { removeSelectedItems } = useCartStore();
  const queryClient = useQueryClient();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Verifica se os dados essenciais do perfil estão completos
  const isProfileComplete = !!profile?.full_name && !!profile?.cpf && !!profile?.phone && !!session?.user.email;

  // Função para criar o pedido no Supabase com status 'pending'
  const { mutateAsync: createPendingOrder, isPending: isFinalizingOrder } = useMutation({
    mutationFn: async (chargeId: string) => {
      if (!session?.user.id || !selectedAddressId || !paymentMethod || items.length === 0 || !shippingRate) {
        throw new Error("Dados do pedido incompletos para finalização.");
      }

      // 1. Buscar o endereço completo para fazer o snapshot
      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', selectedAddressId)
        .single();
      
      if (addressError) throw new Error(`Endereço de entrega não encontrado: ${addressError.message}`);
      
      // 2. Criar o Pedido (Status 'pending')
      // Nota: pix_charge_id será adicionado depois que o Pix for gerado, ou no webhook.
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: session.user.id, total_amount: totalAmount, status: 'pending',
        shipping_address_id: selectedAddressId, payment_method: paymentMethod,
        shipping_cost: shippingCost,
        pix_charge_id: chargeId,
        shipping_service_id: shippingRate.id.toString(),
        shipping_service_name: shippingRate.name,
        delivery_time: deliveryTime?.toString(),
        // Snapshot do endereço
        shipping_street: address.street,
        shipping_number: address.number,
        shipping_complement: address.complement,
        shipping_neighborhood: address.neighborhood,
        shipping_city: address.city,
        shipping_state: address.state,
        shipping_zip_code: address.zip_code,
      }).select('id').single();
      if (orderError) throw orderError;
      
      const newOrderId = orderData.id;
      
      // 3. Criar os Itens do Pedido
      const orderItems = items.map(item => ({
        order_id: newOrderId, product_id: item.id, quantity: item.quantity,
        price: item.price, selected_size: item.selectedSize, selected_color: item.selectedColor,
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        // Se falhar, tentamos reverter o pedido
        await supabase.from('orders').delete().eq('id', newOrderId);
        throw itemsError;
      }
      
      // 4. Limpar itens do carrinho que foram selecionados (apenas localmente, o webhook limpa do DB)
      // Nota: A limpeza do DB é feita no webhook, mas removemos localmente para atualizar a UI
      removeSelectedItems();

      return newOrderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userOrders", session?.user.id] });
    },
    onError: (error: Error) => {
      showError(`Erro ao finalizar o pedido: ${error.message}`);
    },
  });

  const checkPixStatus = async (chargeId: string) => {
    if (isFinalizingOrder) return;
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-pix-status', { body: { pix_charge_id: chargeId } });
      if (error || data.error) throw new Error(error?.message || data.error);
      
      if (data.status === 'PAID' || data.status === 'CONFIRMED') {
        showSuccess("Pagamento confirmado! Seu pedido está sendo processado.");
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        onOpenChange(false);
        navigate('/profile/orders');
      }
    } catch (err: any) {
      console.error("Falha ao verificar status do Pix:", err.message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const handleCopyToClipboard = () => {
    if (pixData?.br_code) {
      navigator.clipboard.writeText(pixData.br_code);
      showSuccess("Código Pix copiado!");
    }
  };

  const handleCloseDialog = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (pollingInterval.current) clearInterval(pollingInterval.current);
  };

  async function handleGeneratePix() {
    if (totalAmount <= 0) {
        showError("O valor total do pedido deve ser maior que zero.");
        return;
    }
    if (!isProfileComplete) {
        showError("Por favor, complete seu perfil (Nome, CPF, Telefone e Email) antes de gerar o Pix.");
        return;
    }
    
    const customerName = profile?.full_name;
    const customerEmail = session?.user.email;
    const customerMobile = profile?.phone;
    const customerDocument = profile?.cpf;

    if (!customerName || !customerEmail || !customerMobile || !customerDocument) {
        showError("Dados do perfil incompletos. Por favor, complete seu perfil.");
        return;
    }

    setIsLoading(true);
    let orderId: string | null = null;
    let pixChargeId: string | null = null;

    try {
      // 1. Gerar o QR Code na Abacate Pay
      const amountToSend = parseFloat(totalAmount.toFixed(2));
      
      const { data: pixGenData, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: amountToSend, 
          customerName, 
          customerEmail,
          customerMobile, 
          customerDocument,
          // Não passamos externalId aqui, pois ele será o ID do pedido que criaremos em seguida.
        },
      });
      
      if (error || pixGenData.error) {
        console.error("Erro detalhado da Edge Function:", error?.message || pixGenData.error);
        throw new Error(error?.message || pixGenData.error);
      }
      
      pixChargeId = pixGenData.pix_charge_id;

      // 2. Criar o pedido no Supabase com status 'pending' e o pix_charge_id
      // O ID do pedido (orderId) será usado como externalId na Abacate Pay (via webhook)
      orderId = await createPendingOrder.mutateAsync(pixChargeId);
      
      // 3. Atualizar o Pix na Abacate Pay com o externalId (ID do pedido)
      // Isso é necessário para que o webhook saiba qual pedido atualizar.
      const updatePixResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ABACATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: pixChargeId,
          metadata: { externalId: orderId }
        })
      });

      if (!updatePixResponse.ok) {
        const updateErrorData = await updatePixResponse.json();
        console.error("Erro ao atualizar Pix com externalId:", updateErrorData);
        // Não é um erro crítico para o usuário, mas logamos.
      }

      setPixData(pixGenData);

      // 4. Iniciar o polling para verificar o status (fallback para o webhook)
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(() => {
        checkPixStatus(pixGenData.pix_charge_id);
      }, 5000);

    } catch (err: any) {
      showError(err.message || "Erro ao gerar QR Code.");
      // Se falhar após criar o pedido, tentamos cancelar o pedido pendente
      if (orderId) {
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        queryClient.invalidateQueries({ queryKey: ["userOrders", session?.user.id] });
      }
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    } finally {
      setIsLoading(false);
    }
  }

  const renderProfileConfirmation = () => (
    <div className="space-y-4 py-4">
        <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                O Pix será gerado usando os dados abaixo. Certifique-se de que estão corretos.
            </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{profile?.full_name || '-'}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground">CPF</Label>
                <p className="font-medium">{profile?.cpf || '-'}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground">Telefone</Label>
                <p className="font-medium">{profile?.phone || '-'}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{session?.user.email || '-'}</p>
            </div>
        </div>
        
        {!isProfileComplete && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Dados incompletos. Por favor, <Link to="/profile/details" className="font-semibold underline">complete seu perfil</Link> (Nome, CPF e Telefone) para gerar o Pix.
                </AlertDescription>
            </Alert>
        )}

        <Separator />

        <DialogFooter>
            <Button 
                onClick={handleGeneratePix} 
                disabled={!isProfileComplete || isLoading || isFinalizingOrder || isLoadingProfile} 
                className="w-full"
            >
                {(isLoading || isFinalizingOrder || isLoadingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar QR Code de {formatCurrency(totalAmount)}
            </Button>
        </DialogFooter>
    </div>
  );

  const renderPixDetails = () => (
    <div className="flex flex-col items-center gap-6 py-4">
      <img src={pixData!.qr_code_url} alt="QR Code Pix" className="w-56 h-56 rounded-lg" />
      <div className="w-full space-y-2">
        <Label htmlFor="pix-code">Pix Copia e Cola</Label>
        <div className="flex items-center gap-2">
          <Input id="pix-code" value={pixData!.br_code} readOnly className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
          <Button size="icon" onClick={handleCopyToClipboard}><Copy className="h-4 w-4" /></Button>
        </div>
      </div>
      <DialogFooter className="w-full">
        <Button onClick={() => checkPixStatus(pixData!.pix_charge_id)} disabled={isCheckingStatus} className="w-full">
          {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Já Paguei (Verificar Status)
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento com Pix</DialogTitle>
          <DialogDescription>
            {pixData ? "Escaneie o QR Code ou copie o código para pagar." : "Confirme seus dados para gerar o Pix."}
          </DialogDescription>
        </DialogHeader>
        {pixData ? renderPixDetails() : renderProfileConfirmation()}
      </DialogContent>
    </Dialog>
  );
}