export type Role = 'client' | 'admin';
export type OrderStatus =
  | 'requested'
  | 'validating'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'incident'
  | 'cancelled';
export type Fulfillment = 'pickup' | 'delivery';
export type Frequency = 'weekly' | 'biweekly' | 'monthly';
export type PaymentMethod = 'bank_transfer' | 'authorized_credit' | 'point_of_sale';
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  phone: string;
}
export interface Client {
  id: string;
  profile_id: string;
  business_name: string;
  tax_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  active: boolean;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  presentation: string;
  image_url: string;
  reference_price: number;
  active: boolean;
  updated_at: string;
}
export interface Tier {
  id: number;
  min_quantity: number;
  max_quantity: number | null;
  discount_percent: number;
}
export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  reference_unit_price: number;
  volume_discount_percent: number;
  estimated_line_total: number;
  confirmed_unit_price: number | null;
  confirmed_line_total: number | null;
}
export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  status: OrderStatus;
  requested_date: string;
  fulfillment_type: Fulfillment;
  delivery_address: string | null;
  reference_subtotal: number;
  estimated_discount: number;
  estimated_total: number;
  confirmed_total: number | null;
  payment_status: 'pending' | 'simulated_paid';
  incident_note: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}
export interface Schedule {
  id: string;
  client_id: string;
  frequency: Frequency;
  next_due_date: string;
  active: boolean;
  fulfillment_type: Fulfillment;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: { product_id: string; quantity: number }[];
}
export interface Payment {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  status: 'pending' | 'simulated_paid';
  amount: number;
  created_at: string;
}
export interface PortalData {
  profile: Profile;
  client: Client | null;
  products: Product[];
  tiers: Tier[];
  orders: Order[];
  schedules: Schedule[];
  clients: Client[];
  payments: Payment[];
  demo: boolean;
}
export interface OrderDraft {
  items: { product_id: string; quantity: number }[];
  requested_date: string;
  fulfillment_type: Fulfillment;
  delivery_address: string;
  schedule_id?: string;
}
export const statusLabels: Record<OrderStatus, string> = {
  requested: 'Solicitud recibida',
  validating: 'En validación',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  incident: 'Incidencia',
  cancelled: 'Cancelado',
};
export const frequencyLabels: Record<Frequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Cada 15 días',
  monthly: 'Mensual',
};
export const paymentLabels: Record<PaymentMethod, string> = {
  bank_transfer: 'Transferencia bancaria',
  authorized_credit: 'Crédito autorizado',
  point_of_sale: 'Pago en Punto de Venta',
};
export const progression: OrderStatus[] = [
  'requested',
  'validating',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];
export const referenceNotice =
  'El precio mostrado es de referencia. ZUCARMEX confirmará disponibilidad, precio final y condiciones comerciales al procesar la solicitud.';
