// Sólo Node. No importar este archivo en la aplicación cliente.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.');
const passwords = [process.env.DEMO_CLIENT_PASSWORD, process.env.DEMO_ADMIN_PASSWORD];
if (passwords.some((p) => !p || p.length < 12))
  throw new Error('Define DEMO_CLIENT_PASSWORD y DEMO_ADMIN_PASSWORD con al menos 12 caracteres.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function must(promise) {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
const definitions = [
  {
    email: 'cliente@demo-zucarmex.com',
    name: 'María González',
    role: 'client',
    password: passwords[0],
  },
  {
    email: 'admin@demo-zucarmex.com',
    name: 'Equipo ZUCARMEX',
    role: 'admin',
    password: passwords[1],
  },
];
const users = [];
for (let page = 1; ; page++) {
  const result = await must(db.auth.admin.listUsers({ page, perPage: 1000 }));
  users.push(...result.users);
  if (result.users.length < 1000) break;
}
let clientUserId;
for (const def of definitions) {
  const existing = users.find((u) => u.email === def.email);
  const result = await must(
    existing
      ? db.auth.admin.updateUserById(existing.id, {
          password: def.password,
          email_confirm: true,
          user_metadata: { full_name: def.name },
        })
      : db.auth.admin.createUser({
          email: def.email,
          password: def.password,
          email_confirm: true,
          user_metadata: { full_name: def.name },
        }),
  );
  await must(
    db
      .from('profiles')
      .upsert({ id: result.user.id, full_name: def.name, role: def.role, phone: '667 000 0101' }),
  );
  if (def.role === 'client') clientUserId = result.user.id;
  console.log(`Usuario demo preparado: ${def.email} (${def.role}).`);
}
const clientId = '10000000-0000-4000-8000-000000000001';
const productId = '30000000-0000-4000-8000-000000000001';
const address = 'Av. de los Panaderos 120, Col. Centro, Culiacán, Sinaloa, C.P. 80000';
await must(
  db.from('clients').upsert({
    id: clientId,
    profile_id: clientUserId,
    business_name: 'Panadería La Espiga',
    tax_name: 'Panadería La Espiga · Negocio ficticio',
    phone: '667 000 0101',
    address: 'Av. de los Panaderos 120, Col. Centro',
    city: 'Culiacán',
    state: 'Sinaloa',
    postal_code: '80000',
    active: true,
  }),
);
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mazatlan',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const add = (n) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const products = await must(
  db
    .from('products')
    .select('id,name,presentation,unit_weight_kg,reference_price')
    .eq('id', productId),
);
if (!products.length)
  throw new Error('Aplica primero supabase/seed.sql para crear los productos demo.');
const price = Number(products[0].reference_price);
const fixtures = [
  ['40000000-0000-4000-8000-000000000001', 'ZUC-00128', 20, 'preparing', 1],
  ['40000000-0000-4000-8000-000000000002', 'ZUC-00124', 20, 'delivered', 15],
  ['40000000-0000-4000-8000-000000000003', 'ZUC-00119', 25, 'delivered', 30],
];
for (const [id, number, quantity, status, ago] of fixtures) {
  const prior = await must(db.from('orders').select('id').eq('id', id));
  if (prior.length) continue;
  const subtotal = quantity * price;
  const total = Math.round(subtotal * 100) / 100;
  await must(
    db.from('orders').insert({
      id,
      order_number: number,
      client_id: clientId,
      status,
      requested_date: status === 'delivered' ? add(-ago + 2) : add(2),
      fulfillment_type: 'delivery',
      delivery_address: address,
      reference_subtotal: subtotal,
      estimated_discount: 0,
      estimated_total: total,
      confirmed_total: total,
      payment_method: 'bank_transfer',
      payment_status: status === 'delivered' ? 'simulated_paid' : 'pending',
      created_at: `${add(-ago)}T16:30:00Z`,
    }),
  );
  await must(
    db.from('order_items').insert({
      order_id: id,
      product_id: productId,
      product_name: products[0].name,
      product_presentation: products[0].presentation,
      unit_weight_kg: products[0].unit_weight_kg,
      quantity,
      reference_unit_price: price,
      volume_discount_percent: 0,
      estimated_line_total: total,
      confirmed_unit_price: price,
      confirmed_line_total: total,
    }),
  );
  if (status === 'delivered')
    await must(
      db.from('payments').insert({
        order_id: id,
        payment_method: 'bank_transfer',
        status: 'simulated_paid',
        amount: total,
      }),
    );
}
const sid = '50000000-0000-4000-8000-000000000001';
const prior = await must(db.from('recurring_schedules').select('id').eq('id', sid));
if (!prior.length) {
  await must(
    db.from('recurring_schedules').insert({
      id: sid,
      client_id: clientId,
      frequency: 'biweekly',
      next_due_date: today,
      active: true,
      fulfillment_type: 'delivery',
      delivery_address: address,
    }),
  );
  await must(
    db
      .from('recurring_schedule_items')
      .insert({ schedule_id: sid, product_id: productId, quantity: 20 }),
  );
}
console.log('Negocio, historial y programación DEMO preparados. Las contraseñas no se imprimen.');
