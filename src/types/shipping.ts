export interface ShippingOption {
  id: string; // ID do serviço do Melhor Envio (ex: '1' para PAC)
  name: string; // Nome do serviço (ex: 'PAC', 'Sedex', 'Jadlog')
  price: number;
  delivery_time: number; // Prazo em dias úteis
}

// Mantendo ShippingZone para compatibilidade, mas não será mais usado para cálculo
export interface ShippingZone {
  id: string;
  label?: string;
  min_km: number;
  max_km: number;
  price: number;
  created_at: string;
}