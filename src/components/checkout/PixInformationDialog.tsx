import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Loader2, Copy, AlertCircle, Check } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useSessionStore } from "@/store/sessionStore";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import PixCustomerForm, { PixCustomerFormValues } from "./PixCustomerForm";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "../ui/card";

interface PixData {
  qrCodeUrl: string; // Alterado de qr_code_url
  brCode: string; // Alterado de br_code
  id: string; // Alterado de pix_charge_id
  expiresAt: string; // Alterado de expires_at
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

export function PixInformationDialog({
  open,
  onOpenChange,
  totalAmount,
  items,
  selectedAddressId,
  paymentMethod,
  shippingCost,
  shippingRate,
  deliveryTime
}: PixInformationDialogProps) {
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [pixGenerationError, setPixGenerationError] = useState<string | null>(null);
  const session = useSessionStore((state) => state.session);
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const navigate = useNavigate();
  const { removeSelectedItems } = useCartStore();
  const queryClient = useQueryClient();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

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
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: session.user.id,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address_id: selectedAddressId,
        payment_method: paymentMethod,
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
        order_id: newOrderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        // Se falhar, tentamos reverter o pedido
        await supabase.from('orders').delete().eq('id', newOrderId);
        throw itemsError;
      }

      // 4. Limpar itens do carrinho que foram selecionados (apenas localmente)
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
      const { data, error } = await supabase.functions.invoke('check-pix-status', {
        body: {
          pix_charge_id: chargeId
        }
      });

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
    // Iniciar contador regressivo quando pixData for definido
    if (pixData?.expiresAt) {
      const expirationTime = new Date(pixData.expiresAt).getTime(); // Usando expiresAt
      const now = new Date().getTime();
      const initialTimeLeft = Math.max(0, Math.floor((expirationTime - now) / 1000));
      setTimeLeft(initialTimeLeft);

      if (initialTimeLeft > 0) {
        countdownInterval.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev === null || prev <= 1) {
              if (countdownInterval.current) clearInterval(countdownInterval.current);
              // Se o tempo acabar, para o polling
              if (pollingInterval.current) clearInterval(pollingInterval.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [pixData]);

  const handleCopyToClipboard = () => {
    if (pixData?.brCode) { // Usando brCode
      navigator.clipboard.writeText(pixData.brCode);
      setIsCopied(true);
      showSuccess("Código Pix copiado!");
      
      // Resetar o estado de copiado após 2 segundos
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCloseDialog = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    // Resetar o estado do Pix ao fechar
    if (!isOpen) {
        setPixData(null);
        setTimeLeft(null);
        setPixGenerationError(null); // Limpa o erro ao fechar
    }
  };

  async function handleGeneratePix(values: PixCustomerFormValues) {
    if (totalAmount <= 0) {
      showError("O valor total do pedido deve ser maior que zero.");
      return;
    }

    setIsLoadingPix(true);
    setPixGenerationError(null); // Limpa erros anteriores
    let orderId: string | null = null;

    try {
      // 1. Gerar o QR Code na Abacate Pay
      const amountToSend = parseFloat(totalAmount.toFixed(2));
      
      const { data: pixGenData, error } = await supabase.functions.invoke('generate-pix', {
        body: {
          amount: amountToSend,
          customerName: values.full_name,
          customerEmail: values.email,
          customerMobile: values.phone,
          customerDocument: values.cpf,
        }
      });

      if (error || pixGenData.error) {
        console.error("Erro detalhado da Edge Function:", error?.message || pixGenData.error);
        throw new Error(error?.message || pixGenData.error || "Falha desconhecida ao gerar Pix.");
      }
      
      // 2. Criar o pedido no Supabase com status 'pending' e o pix_charge_id
      // Usando pixGenData.id (novo nome)
      orderId = await createPendingOrder(pixGenData.id);

      // 3. Atualizar o Pix na Abacate Pay com o externalId (ID do pedido)
      const { error: updateError } = await supabase.functions.invoke('update-pix-external-id', {
        body: {
          pixChargeId: pixGenData.id, // Usando pixGenData.id
          externalId: orderId,
        }
      });

      if (updateError) {
        console.error("Erro ao atualizar Pix com externalId:", updateError.message);
        // Não é um erro crítico para o usuário, mas logamos.
      }

      setPixData({
        qrCodeUrl: pixGenData.qrCodeUrl, // Usando qrCodeUrl
        brCode: pixGenData.brCode, // Usando brCode
        id: pixGenData.id, // Usando id
        expiresAt: pixGenData.expiresAt || new Date(Date.now() + 3600000).toISOString() // Usando expiresAt
      });

      // 4. Iniciar o polling para verificar o status (fallback para o webhook)
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(() => {
        checkPixStatus(pixGenData.id); // Usando pixGenData.id
      }, 5000);
    } catch (err: any) {
      const errorMessage = err.message || "Erro desconhecido ao gerar QR Code.";
      setPixGenerationError(errorMessage); // Define o erro para exibição
      showError(errorMessage);
      
      // Se falhar após criar o pedido, tentamos cancelar o pedido pendente
      if (orderId) {
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        queryClient.invalidateQueries({ queryKey: ["userOrders", session?.user.id] });
      }
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      setPixData(null); // Garante que o estado seja limpo em caso de erro
    } finally {
      setIsLoadingPix(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPixDetails = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Escaneie o QR Code</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Abra seu app de pagamentos e escaneie o código abaixo
        </p>
      </div>

      <Card className="border-2 border-dashed">
        <CardContent className="p-6 flex flex-col items-center">
          {pixData?.qrCodeUrl ? ( // Usando qrCodeUrl
            <img 
              src={pixData.qrCodeUrl} 
              alt="QR Code Pix" 
              className="w-48 h-48 rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Tempo restante:</span>
          <span className={`text-lg font-bold ${timeLeft !== null && timeLeft < 300 ? 'text-destructive' : 'text-primary'}`}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix-code">Código Pix (Copia e Cola)</Label>
          <div className="flex gap-2">
            <Input 
              id="pix-code" 
              value={pixData?.brCode || ''} // Usando brCode
              readOnly 
              className="flex-1"
            />
            <Button 
              size="icon" 
              onClick={handleCopyToClipboard}
              disabled={isCopied}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole este código no seu app bancário para pagar
          </p>
        </div>
      </div>

      <DialogFooter className="flex flex-col gap-2">
        <Button 
          onClick={() => pixData && checkPixStatus(pixData.id)} // Usando pixData.id
          disabled={isCheckingStatus}
          className="w-full"
        >
          {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Já Paguei (Verificar Status)
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleCloseDialog(false)}
          className="w-full"
        >
          Cancelar Pedido
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        // Impede o fechamento ao clicar fora se o Pix já foi gerado
        onInteractOutside={(e) => {
            if (pixData) {
                e.preventDefault();
            }
        }}
      >
        <DialogHeader>
          <DialogTitle>Pagamento com Pix</DialogTitle>
          <DialogDescription>
            {pixData 
              ? "Complete seu pagamento escaneando o QR Code ou copiando o código" 
              : "Confirme seus dados para gerar o Pix"}
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingProfile ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : pixData ? (
          renderPixDetails()
        ) : (
          <div className="space-y-4 py-4">
            {pixGenerationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Falha ao gerar Pix: {pixGenerationError}
                    </AlertDescription>
                </Alert>
            )}
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O Pix exige que o nome, CPF e telefone estejam preenchidos corretamente.
              </AlertDescription>
            </Alert>
            <PixCustomerForm 
              profile={profile} 
              session={session} 
              onGeneratePix={handleGeneratePix} 
              isGenerating={isLoadingPix || isFinalizingOrder}
              totalAmount={totalAmount}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}