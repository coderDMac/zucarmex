import { Order, OrderItem, Payment, PaymentMethod, Product } from './types';
import { roundMoney } from './pricing';

export function itemName(item: OrderItem, products: Product[]) {
  return item.product_name || products.find((p) => p.id === item.product_id)?.name || 'Producto';
}
export function itemPresentation(item: OrderItem, products: Product[]) {
  return (
    item.product_presentation || products.find((p) => p.id === item.product_id)?.presentation || ''
  );
}
export function orderVolume(items: Pick<OrderItem, 'quantity' | 'unit_weight_kg'>[]) {
  let grams = 0;
  let units = 0;
  let unweighedUnits = 0;
  for (const item of items) {
    units += item.quantity;
    if (
      item.unit_weight_kg != null &&
      Number.isFinite(item.unit_weight_kg) &&
      item.unit_weight_kg > 0
    )
      grams += Math.round(item.unit_weight_kg * 1000) * item.quantity;
    else unweighedUnits += item.quantity;
  }
  return { units, tonnes: grams / 1_000_000, unweighedUnits };
}
export const tonnesLabel = (tonnes: number) =>
  `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 }).format(tonnes)} t`;

export function volumeLabel(volume: ReturnType<typeof orderVolume>) {
  if (volume.units > 0 && volume.unweighedUnits === volume.units) return 'Peso pendiente';
  return `${tonnesLabel(volume.tonnes)}${volume.unweighedUnits > 0 ? ' · parcial' : ''}`;
}

// Venta para este prototipo = pedido entregado con importe confirmado.
// La fecha de compra es la fecha registrada del pedido, nunca updated_at.
export function purchaseHistory(orders: Order[]) {
  const purchases = orders.filter(
    (order) => order.status === 'delivered' && order.confirmed_total !== null,
  );
  const latest = [...purchases].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    count: purchases.length,
    amount: roundMoney(purchases.reduce((sum, order) => sum + order.confirmed_total!, 0)),
    ...orderVolume(purchases.flatMap((order) => order.items)),
    latest,
  };
}
export function paymentMethodFor(order: Order, payments: Payment[]): PaymentMethod | null {
  return (
    payments.find((payment) => payment.order_id === order.id && payment.status === 'simulated_paid')
      ?.payment_method ??
    order.payment_method ??
    null
  );
}
