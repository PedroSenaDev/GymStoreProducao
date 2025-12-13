import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

interface PaymentStepProps {
  selectedPaymentMethod: string | null;
  onPaymentMethodSelect: (method: string) => void;
}

export function PaymentStep({ selectedPaymentMethod, onPaymentMethodSelect }: PaymentStepProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <RadioGroup
          value={selectedPaymentMethod || ""}
          onValueChange={onPaymentMethodSelect}
          className="space-y-4"
        >
          {/* Removida a opção Pix */}
          <Label
            htmlFor="payment-card"
            className="flex cursor-pointer rounded-lg border p-4 transition-colors has-[:checked]:border-primary"
          >
            <RadioGroupItem value="credit_card" id="payment-card" className="mr-4 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6" />
                <span className="font-semibold">Cartão de Crédito</span>
              </div>
              {/* O formulário real do cartão será renderizado pelo Stripe PaymentElement no CheckoutPage */}
            </div>
          </Label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}