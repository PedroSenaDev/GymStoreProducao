export interface Address {
  id: string;
  user_id: string;
  street: string;
  number?: string;
  complement?: string;
  ponto_referencia?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}