import { OrderDraft, Fulfillment, Product } from './types';
import { validateFutureDate } from './dates';
export function validateDraft(input: unknown): OrderDraft {
  const data = input as OrderDraft;
  if (!data || !Array.isArray(data.items) || !data.items.length || data.items.length > 50)
    throw new Error('Selecciona al menos un producto.');
  const ids = new Set<string>();
  for (const line of data.items) {
    if (
      !line ||
      typeof line.product_id !== 'string' ||
      ids.has(line.product_id) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 10000
    )
      throw new Error('Revisa los productos y cantidades de tu pedido.');
    ids.add(line.product_id);
  }
  validateFutureDate(data.requested_date);
  const fulfillment = data.fulfillment_type as Fulfillment;
  if (!['pickup', 'delivery'].includes(fulfillment))
    throw new Error('Selecciona una modalidad de entrega.');
  if (
    fulfillment === 'delivery' &&
    (typeof data.delivery_address !== 'string' ||
      data.delivery_address.trim().length < 10 ||
      data.delivery_address.length > 500)
  )
    throw new Error('Escribe una dirección de entrega válida.');
  return data;
}
export function validateProduct(input: unknown): Omit<Product, 'id' | 'updated_at'> {
  const p = input as Product;
  if (
    !p ||
    !p.sku?.trim() ||
    !p.name?.trim() ||
    !p.presentation?.trim() ||
    p.sku.length > 50 ||
    p.name.length > 150 ||
    p.presentation.length > 100 ||
    !Number.isFinite(p.reference_price) ||
    p.reference_price <= 0 ||
    p.reference_price > 1000000 ||
    typeof p.active !== 'boolean' ||
    typeof p.description !== 'string' ||
    p.description.length > 1000 ||
    typeof p.image_url !== 'string' ||
    p.image_url.length > 1000 ||
    (p.image_url && !/^\/images\/[\w.-]+$|^https:\/\//.test(p.image_url))
  )
    throw new Error(
      'Revisa los campos del producto. Usa un precio positivo y una imagen local o HTTPS.',
    );
  return {
    sku: p.sku.trim(),
    name: p.name.trim(),
    presentation: p.presentation.trim(),
    description: p.description,
    image_url: p.image_url,
    reference_price: p.reference_price,
    active: p.active,
  };
}
