import 'server-only';
import { randomUUID } from 'node:crypto';
import { getPortalData } from './data/repository';
import { mutateDemo } from './data/demo-store';
import { validateDraft, validateProduct } from './domain/validation';
import { priceOrder, roundMoney, validateTiers } from './domain/pricing';
import { advanceSchedule, today } from './domain/dates';
import { Frequency, OrderStatus, PaymentMethod, Product, Tier, statusLabels } from './domain/types';
import { supabaseServer } from './supabase/server';
async function rpc(name: string, args: Record<string, unknown>) {
  const db = await supabaseServer();
  const result = await db.rpc(name, args);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export async function submitOrder(input: unknown) {
  const draft = validateDraft(input);
  const data = await getPortalData();
  if (!data.client?.active || data.profile.role !== 'client')
    throw new Error('Tu negocio no está habilitado para realizar solicitudes.');
  if (!data.demo)
    return rpc('submit_order', {
      p_items: draft.items,
      p_requested_date: draft.requested_date,
      p_fulfillment_type: draft.fulfillment_type,
      p_delivery_address: draft.delivery_address,
      p_schedule_id: draft.schedule_id ?? null,
    });
  return mutateDemo((store) => {
    const pricing = priceOrder(draft.items, store.products, store.tiers);
    const schedule = draft.schedule_id
      ? store.schedules.find((s) => s.id === draft.schedule_id && s.client_id === data.client!.id)
      : null;
    if (draft.schedule_id && (!schedule || !schedule.active || schedule.next_due_date > today()))
      throw new Error('Esta programación ya fue revisada o aún no está pendiente.');
    const id = randomUUID();
    const now = new Date().toISOString();
    store.orders.unshift({
      id,
      order_number: `ZUC-${String(Math.max(128, ...store.orders.map((o) => Number(o.order_number.split('-')[1]))) + 1).padStart(5, '0')}`,
      client_id: data.client!.id,
      status: 'requested',
      requested_date: draft.requested_date,
      fulfillment_type: draft.fulfillment_type,
      delivery_address:
        draft.fulfillment_type === 'delivery' ? draft.delivery_address.trim() : null,
      reference_subtotal: pricing.subtotal,
      estimated_discount: pricing.discount,
      estimated_total: pricing.total,
      confirmed_total: null,
      payment_status: 'pending',
      incident_note: null,
      created_at: now,
      updated_at: now,
      items: pricing.lines.map((l) => ({
        ...l,
        id: randomUUID(),
        confirmed_unit_price: null,
        confirmed_line_total: null,
      })),
    });
    if (schedule) {
      schedule.next_due_date = advanceSchedule(schedule.next_due_date, schedule.frequency);
      schedule.updated_at = now;
    }
    return id;
  });
}
export async function updateOrder(
  id: string,
  input: {
    status: OrderStatus;
    prices: Record<string, number>;
    incident_note: string;
    availability: boolean;
  },
) {
  const data = await getPortalData();
  if (data.profile.role !== 'admin') throw new Error('Acceso exclusivo de administración.');
  const order = data.orders.find((o) => o.id === id);
  if (!order) throw new Error('Pedido no encontrado.');
  if (!Object.hasOwn(statusLabels, input.status)) throw new Error('Estado inválido.');
  const confirmed = ['confirmed', 'preparing', 'ready', 'delivered'].includes(input.status);
  if (confirmed && !input.availability)
    throw new Error('Confirma la disponibilidad de los productos.');
  if (!data.demo)
    return rpc('admin_update_order', {
      p_id: id,
      p_status: input.status,
      p_prices: input.prices,
      p_incident_note: input.incident_note,
    });
  return mutateDemo((store) => {
    const o = store.orders.find((o) => o.id === id)!;
    if (['delivered', 'cancelled'].includes(o.status) && o.status !== input.status)
      throw new Error('El pedido ya está cerrado.');
    if (
      o.payment_status === 'simulated_paid' &&
      ['requested', 'validating', 'cancelled'].includes(input.status)
    )
      throw new Error(
        'El pedido tiene un pago registrado; registra una incidencia para su revisión.',
      );
    if (input.status === 'incident' && input.incident_note?.trim().length < 5)
      throw new Error('Describe la incidencia.');
    if (confirmed) {
      if (['requested', 'validating'].includes(o.status) && input.status !== 'confirmed')
        throw new Error('Confirma primero disponibilidad y precio.');
      o.items.forEach((i) => {
        const p = input.prices?.[i.id];
        if (!Number.isFinite(p) || p <= 0 || p > 1000000)
          throw new Error('Revisa todos los precios confirmados.');
        if (o.payment_status === 'simulated_paid' && roundMoney(p) !== i.confirmed_unit_price)
          throw new Error('No se puede modificar un precio pagado.');
        i.confirmed_unit_price = roundMoney(p);
        i.confirmed_line_total = roundMoney(
          i.confirmed_unit_price * i.quantity * (1 - i.volume_discount_percent / 100),
        );
      });
      o.confirmed_total = roundMoney(o.items.reduce((s, i) => s + i.confirmed_line_total!, 0));
    }
    o.status = input.status;
    o.incident_note = input.status === 'incident' ? input.incident_note : null;
    o.updated_at = new Date().toISOString();
  });
}
export async function simulatePayment(id: string, method: PaymentMethod) {
  if (!['bank_transfer', 'authorized_credit', 'point_of_sale'].includes(method))
    throw new Error('Selecciona un método válido.');
  const data = await getPortalData();
  if (data.profile.role !== 'client') throw new Error('Acceso exclusivo de clientes.');
  if (!data.demo) return rpc('simulate_payment', { p_order_id: id, p_method: method });
  return mutateDemo((store) => {
    const o = store.orders.find((o) => o.id === id && o.client_id === data.client?.id);
    if (
      !o ||
      !['confirmed', 'preparing', 'ready', 'delivered'].includes(o.status) ||
      o.confirmed_total === null
    )
      throw new Error('El pedido debe estar confirmado antes del pago.');
    const existing = store.payments.find((p) => p.order_id === id);
    if (existing) return existing.id;
    const pid = randomUUID();
    store.payments.push({
      id: pid,
      order_id: id,
      payment_method: method,
      status: 'simulated_paid',
      amount: o.confirmed_total,
      created_at: new Date().toISOString(),
    });
    o.payment_status = 'simulated_paid';
    o.updated_at = new Date().toISOString();
    return pid;
  });
}
export async function createSchedule(id: string, frequency: Frequency, date: string) {
  if (
    !['weekly', 'biweekly', 'monthly'].includes(frequency) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
    date < today()
  )
    throw new Error('Revisa la frecuencia y la próxima fecha.');
  const data = await getPortalData();
  const o = data.orders.find((o) => o.id === id && o.client_id === data.client?.id);
  if (!o || data.profile.role !== 'client') throw new Error('Pedido no autorizado.');
  if (!data.demo)
    return rpc('create_schedule', {
      p_order_id: id,
      p_frequency: frequency,
      p_next_due_date: date,
    });
  return mutateDemo((store) => {
    const sid = randomUUID();
    const now = new Date().toISOString();
    store.schedules.push({
      id: sid,
      client_id: o.client_id,
      frequency,
      next_due_date: date,
      active: true,
      fulfillment_type: o.fulfillment_type,
      delivery_address: o.delivery_address,
      created_at: now,
      updated_at: now,
      items: o.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    });
    return sid;
  });
}
export async function manageSchedule(id: string, action: string) {
  if (!['skip', 'toggle'].includes(action)) throw new Error('Acción inválida.');
  const data = await getPortalData();
  if (data.profile.role !== 'client') throw new Error('Acceso exclusivo de clientes.');
  if (!data.demo) return rpc('manage_schedule', { p_id: id, p_action: action });
  return mutateDemo((store) => {
    const s = store.schedules.find((s) => s.id === id && s.client_id === data.client?.id);
    if (!s) throw new Error('Programación no encontrada.');
    if (action === 'skip') {
      if (!s.active || s.next_due_date > today())
        throw new Error('Esta recurrencia aún no está pendiente.');
      s.next_due_date = advanceSchedule(s.next_due_date, s.frequency);
    } else s.active = !s.active;
    s.updated_at = new Date().toISOString();
  });
}
export async function saveProduct(id: string, input: unknown) {
  const data = await getPortalData();
  if (data.profile.role !== 'admin') throw new Error('Acceso exclusivo de administración.');
  const product = validateProduct(input);
  if (!data.demo) {
    const db = await supabaseServer();
    const result =
      id === 'new'
        ? await db.from('products').insert(product)
        : await db.from('products').update(product).eq('id', id);
    if (result.error) throw new Error('No se pudo guardar. Verifica que el SKU sea único.');
    return;
  }
  return mutateDemo((store) => {
    if (store.products.some((p) => p.sku === product.sku && p.id !== id))
      throw new Error('El SKU ya existe.');
    if (id === 'new')
      store.products.push({ ...product, id: randomUUID(), updated_at: new Date().toISOString() });
    else {
      const p = store.products.find((p) => p.id === id);
      if (!p) throw new Error('Producto no encontrado.');
      Object.assign(p, product, { updated_at: new Date().toISOString() });
    }
  });
}
export async function saveTiers(input: Tier[]) {
  const tiers = validateTiers(input);
  const data = await getPortalData();
  if (data.profile.role !== 'admin') throw new Error('Acceso exclusivo de administración.');
  if (!data.demo) return rpc('update_discount_tiers', { p_tiers: tiers });
  return mutateDemo((store) => {
    store.tiers = tiers;
  });
}
export async function saveProfile(input: { full_name: string; phone: string }) {
  if (
    !input.full_name?.trim() ||
    input.full_name.length > 100 ||
    typeof input.phone !== 'string' ||
    input.phone.length > 30
  )
    throw new Error('Revisa tu nombre y teléfono.');
  const data = await getPortalData();
  const values = { full_name: input.full_name.trim(), phone: input.phone.trim() };
  if (!data.demo) {
    const db = await supabaseServer();
    const result = await db.from('profiles').update(values).eq('id', data.profile.id);
    if (result.error) throw new Error('No se pudieron guardar tus datos.');
    return;
  }
  return mutateDemo((store) => {
    Object.assign(
      store.profiles.find((p) => p.id === data.profile.id)!,
      values,
    );
  });
}
