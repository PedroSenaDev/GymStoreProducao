export interface FixedShippingRate {
  id: string;
  label: string;
  min_order_value: number;
  price: number;
  is_active: boolean;
  created_at: string;
  delivery_time_days: number;
}