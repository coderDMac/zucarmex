import 'server-only';
import { cache } from 'react';
import { session } from '@/lib/auth';
import { PortalData, Order, Schedule, Client, Payment, Product } from '@/lib/domain/types';
import { supabaseServer } from '@/lib/supabase/server';
import { readDemo } from './demo-store';
export const getPortalData = cache(async (): Promise<PortalData> => {
  const auth = await session();
  if (!auth) throw new Error('Debes iniciar sesión.');
  if (auth.demo) {
    const data = await readDemo();
    const client = data.clients.find((c) => c.profile_id === auth.profile.id) ?? null;
    const admin = auth.profile.role === 'admin';
    const orders = data.orders
      .filter((o) => admin || o.client_id === client?.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      ...data,
      profile: auth.profile,
      client,
      orders,
      products: data.products.filter((p) => admin || p.active),
      clients: data.clients.filter((c) => admin || c.id === client?.id),
      schedules: data.schedules.filter((s) => admin || s.client_id === client?.id),
      payments: data.payments.filter((p) => orders.some((o) => o.id === p.order_id)),
      demo: true,
    };
  }
  const db = await supabaseServer();
  const results = await Promise.all([
    db.from('clients').select('*').order('business_name'),
    db.from('products').select('*').order('sku'),
    db.from('orders').select('*,items:order_items(*)').order('created_at', { ascending: false }),
    db
      .from('recurring_schedules')
      .select('*,items:recurring_schedule_items(product_id,quantity)')
      .order('next_due_date'),
    db.from('payments').select('*'),
  ]);
  if (results.some((r) => r.error))
    throw new Error(
      'No se pudieron cargar los datos. Verifica la conexión y las migraciones de Supabase.',
    );
  const [clients, products, orders, schedules, payments] = results.map((r) => r.data ?? []);
  return {
    profile: auth.profile,
    client: (clients as Client[]).find((c) => c.profile_id === auth.profile.id) ?? null,
    clients: clients as Client[],
    products: products as Product[],
    orders: orders as unknown as Order[],
    schedules: schedules as unknown as Schedule[],
    payments: payments as Payment[],
    demo: false,
  };
});
