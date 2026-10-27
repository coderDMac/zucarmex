import { OrderDraft, OrderItem, Product } from './types';

export const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Un cambio de estado conserva el importe ya confirmado si el precio no cambia.
// Al confirmar o modificar un precio se calcula únicamente precio × cantidad.
export function confirmationLineTotal(
  item: Pick<OrderItem, 'quantity' | 'confirmed_unit_price' | 'confirmed_line_total'>,
  unitPrice: number,
) {
  const price = roundMoney(unitPrice);
  if (item.confirmed_line_total !== null && item.confirmed_unit_price === price)
    return item.confirmed_line_total;
  return roundMoney(price * item.quantity);
}

// Sólo referencia vigente por cantidad. Las condiciones comerciales se confirman por pedido.
export function priceOrder(items: OrderDraft['items'], products: Product[]) {
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.product_id && p.active);
    if (!product)
      throw new Error('Uno de los productos ya no está disponible. Revisa tu solicitud.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)
      throw new Error('Las cantidades deben ser enteros entre 1 y 10,000.');
    const subtotal = roundMoney(product.reference_price * item.quantity);
    return {
      ...item,
      product_name: product.name,
      product_presentation: product.presentation,
      unit_weight_kg: product.unit_weight_kg,
      reference_unit_price: product.reference_price,
      volume_discount_percent: 0,
      estimated_line_total: subtotal,
      subtotal,
    };
  });
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));
  return { lines, subtotal, total: subtotal };
}
