export interface ShippingZone {
  id: string;
  label?: string;
  min_km: number;
  max_km: number;
  price: number;
  created_at: string;
}