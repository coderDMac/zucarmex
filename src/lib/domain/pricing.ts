import { OrderDraft, Product, Tier } from './types';

export const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function discountFor(quantity: number, tiers: Tier[]) {
  return (
    tiers.find(
      (t) => quantity >= t.min_quantity && (t.max_quantity === null || quantity <= t.max_quantity),
    )?.discount_percent ?? 0
  );
}
export function priceOrder(items: OrderDraft['items'], products: Product[], tiers: Tier[]) {
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.product_id && p.active);
    if (!product)
      throw new Error('Uno de los productos ya no está disponible. Revisa tu solicitud.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)
      throw new Error('Las cantidades deben ser enteros entre 1 y 10,000.');
    const percent = discountFor(item.quantity, tiers);
    const subtotal = roundMoney(product.reference_price * item.quantity);
    const total = roundMoney(subtotal * (1 - percent / 100));
    return {
      ...item,
      reference_unit_price: product.reference_price,
      volume_discount_percent: percent,
      estimated_line_total: total,
      subtotal,
    };
  });
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.subtotal, 0));
  const total = roundMoney(lines.reduce((sum, l) => sum + l.estimated_line_total, 0));
  return { lines, subtotal, discount: roundMoney(subtotal - total), total };
}
export function volumeHint(quantity: number, tiers: Tier[]) {
  const current = discountFor(quantity, tiers);
  const next = [...tiers]
    .sort((a, b) => a.min_quantity - b.min_quantity)
    .find((t) => t.min_quantity > quantity && t.discount_percent > current);
  return next
    ? `Agrega ${next.min_quantity - quantity} sacos más y obtén ${next.discount_percent}% de descuento estimado.`
    : `Ya tienes ${current}% de descuento estimado por volumen.`;
}
export function validateTiers(tiers: Tier[]) {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  if (sorted.length !== 4 || sorted[0].min_quantity !== 1 || sorted[3].max_quantity !== null)
    throw new Error('Configura cuatro rangos continuos desde 1 hasta sin límite.');
  sorted.forEach((t, i) => {
    if (
      !Number.isInteger(t.min_quantity) ||
      t.min_quantity < 1 ||
      (t.max_quantity !== null &&
        (!Number.isInteger(t.max_quantity) || t.max_quantity < t.min_quantity)) ||
      !Number.isFinite(t.discount_percent) ||
      t.discount_percent < 0 ||
      t.discount_percent > 100 ||
      (i < 3 && t.max_quantity !== sorted[i + 1].min_quantity - 1) ||
      (i > 0 && t.discount_percent < sorted[i - 1].discount_percent)
    )
      throw new Error(
        'Revisa los rangos: deben ser continuos, sin traslapes y con descuentos crecientes de 0 a 100%.',
      );
  });
  return sorted;
}
