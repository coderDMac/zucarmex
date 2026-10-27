// Ejecutar sólo sobre Supabase local. Verifica Auth, RLS y transacciones reales.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = url && key && service && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const connect = (k) =>
  createClient(url, k, { auth: { persistSession: false, autoRefreshToken: false } });
const good = async (p) => {
  const r = await p;
  assert.ifError(r.error);
  return r.data;
};
test(
  'Supabase real: Auth, aislamiento RLS, solicitud → confirmación → pago y recurrencias',
  { skip: !enabled },
  async (t) => {
    const root = connect(service),
      client = connect(key),
      admin = connect(key),
      other = connect(key),
      anon = connect(key);
    const uid = randomUUID(),
      cid = randomUUID(),
      pid = randomUUID();
    let otherCreated = false;
    const orders = [],
      schedules = [];
    try {
      await good(
        client.auth.signInWithPassword({
          email: 'cliente@demo-zucarmex.com',
          password: process.env.DEMO_CLIENT_PASSWORD,
        }),
      );
      await good(
        admin.auth.signInWithPassword({
          email: 'admin@demo-zucarmex.com',
          password: process.env.DEMO_ADMIN_PASSWORD,
        }),
      );
      const otherEmail = `test-${uid}@demo-zucarmex.com`;
      const otherPassword = randomUUID();
      await good(
        root.auth.admin.createUser({
          id: uid,
          email: otherEmail,
          password: otherPassword,
          email_confirm: true,
        }),
      );
      otherCreated = true;
      await good(
        root.from('clients').insert({
          id: cid,
          profile_id: uid,
          business_name: 'Negocio aislado TEST',
          address: 'Dirección de pruebas 123',
        }),
      );
      await good(other.auth.signInWithPassword({ email: otherEmail, password: otherPassword }));
      await good(
        admin.from('products').insert({
          id: pid,
          sku: `TEST-${pid}`,
          name: 'Producto de prueba',
          description: 'Sólo integración',
          presentation: 'Saco de 50 kg',
          reference_price: 1245,
          unit_weight_kg: 50,
          active: true,
        }),
      );
      const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mazatlan',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const next = new Date(`${date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 2);
      const draft = {
        p_items: [
          { product_id: pid, quantity: 25, reference_unit_price: 1, volume_discount_percent: 90 },
        ],
        p_requested_date: next.toISOString().slice(0, 10),
        p_fulfillment_type: 'delivery',
        p_delivery_address: 'Dirección de prueba 123, Culiacán',
        p_schedule_id: null,
        p_payment_method: 'authorized_credit',
      };
      await t.test('RLS oculta perfiles y negocios ajenos e impide escalar rol', async () => {
        assert.equal((await good(client.from('profiles').select('*'))).length, 1);
        assert.equal((await good(client.from('clients').select('*'))).length, 1);
        const hidden = await client.from('clients').select('*').eq('id', cid);
        assert.equal(hidden.data.length, 0);
        assert.ok(
          (
            await client
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', (await client.auth.getUser()).data.user.id)
          ).error,
        );
        assert.ok((await anon.from('products').select('*')).error);
      });
      let oid;
      await t.test(
        'La RPC guarda referencia, peso y método sin descuentos automáticos',
        async () => {
          oid = await good(client.rpc('submit_order', draft));
          orders.push(oid);
          const o = await good(
            client.from('orders').select('*,items:order_items(*)').eq('id', oid).single(),
          );
          assert.equal(o.status, 'requested');
          assert.equal(o.estimated_total, 31125);
          assert.equal(o.estimated_discount, 0);
          assert.equal(o.payment_method, 'authorized_credit');
          assert.equal(o.items[0].unit_weight_kg, 50);
          assert.equal(o.items[0].product_name, 'Producto de prueba');
          assert.equal(o.items[0].reference_unit_price, 1245);
          assert.equal(o.items[0].volume_discount_percent, 0);
          assert.ok(
            (await client.rpc('submit_order', { ...draft, p_payment_method: 'stripe' })).error,
          );
          assert.ok(
            (
              await client
                .from('orders')
                .update({ status: 'confirmed', confirmed_total: 1 })
                .eq('id', oid)
            ).error,
          );
          assert.equal((await good(other.from('orders').select('*').eq('id', oid))).length, 0);
          assert.ok(
            (await other.rpc('simulate_payment', { p_order_id: oid, p_method: 'bank_transfer' }))
              .error,
          );
          assert.ok(
            (await client.rpc('simulate_payment', { p_order_id: oid, p_method: 'bank_transfer' }))
              .error,
          );
        },
      );
      await t.test(
        'Sólo el administrador confirma y el cliente observa el precio final',
        async () => {
          const items = await good(admin.from('order_items').select('*').eq('order_id', oid));
          const prices = Object.fromEntries(items.map((i) => [i.id, 1240]));
          assert.ok(
            (
              await client.rpc('admin_update_order', {
                p_id: oid,
                p_status: 'confirmed',
                p_prices: prices,
              })
            ).error,
          );
          await good(
            admin.rpc('admin_update_order', { p_id: oid, p_status: 'confirmed', p_prices: prices }),
          );
          const o = await good(client.from('orders').select('*').eq('id', oid).single());
          assert.equal(o.status, 'confirmed');
          assert.equal(o.confirmed_total, 31000);
          await good(
            admin.rpc('admin_update_order', { p_id: oid, p_status: 'preparing', p_prices: prices }),
          );
          assert.equal(
            (await good(client.from('orders').select('confirmed_total').eq('id', oid).single()))
              .confirmed_total,
            31000,
          );
          await good(
            admin
              .from('products')
              .update({
                reference_price: 1300,
                unit_weight_kg: 25,
                name: 'Presentación actualizada',
              })
              .eq('id', pid),
          );
          assert.equal(
            (await good(client.from('order_items').select('*').eq('order_id', oid)))[0]
              .reference_unit_price,
            1245,
          );
        },
      );
      await t.test(
        'El pago es idempotente, usa el total confirmado y protege el precio pagado',
        async () => {
          const p1 = await good(
            client.rpc('simulate_payment', { p_order_id: oid, p_method: 'bank_transfer' }),
          );
          const p2 = await good(
            client.rpc('simulate_payment', { p_order_id: oid, p_method: 'bank_transfer' }),
          );
          assert.equal(p1, p2);
          const p = await good(client.from('payments').select('*').eq('order_id', oid));
          assert.equal(p.length, 1);
          assert.equal(p[0].amount, 31000);
          assert.equal(
            (await good(client.from('orders').select('payment_method').eq('id', oid).single()))
              .payment_method,
            'bank_transfer',
          );
          assert.equal(
            (await good(client.from('orders').select('*').eq('id', oid).single())).payment_status,
            'simulated_paid',
          );
          const items = await good(admin.from('order_items').select('*').eq('order_id', oid));
          assert.ok(
            (
              await admin.rpc('admin_update_order', {
                p_id: oid,
                p_status: 'confirmed',
                p_prices: Object.fromEntries(items.map((i) => [i.id, 1])),
              })
            ).error,
          );
        },
      );
      await t.test(
        'Los importes históricos confirmados permanecen intactos al avanzar de estado',
        async () => {
          const legacyId = await good(client.rpc('submit_order', draft));
          orders.push(legacyId);
          await good(
            root
              .from('order_items')
              .update({
                confirmed_unit_price: 1245,
                confirmed_line_total: 29880,
                volume_discount_percent: 4,
              })
              .eq('order_id', legacyId),
          );
          await good(
            root
              .from('orders')
              .update({ status: 'confirmed', confirmed_total: 29880 })
              .eq('id', legacyId),
          );
          const items = await good(admin.from('order_items').select('id').eq('order_id', legacyId));
          const prices = Object.fromEntries(items.map((item) => [item.id, 1245]));
          await good(
            admin.rpc('admin_update_order', {
              p_id: legacyId,
              p_status: 'preparing',
              p_prices: prices,
            }),
          );
          assert.equal(
            (
              await good(
                client.from('orders').select('confirmed_total').eq('id', legacyId).single(),
              )
            ).confirmed_total,
            29880,
          );
          await good(
            client.rpc('simulate_payment', { p_order_id: legacyId, p_method: 'point_of_sale' }),
          );
          await good(
            admin.rpc('admin_update_order', {
              p_id: legacyId,
              p_status: 'ready',
              p_prices: prices,
            }),
          );
          assert.equal(
            (
              await good(
                client.from('orders').select('confirmed_total').eq('id', legacyId).single(),
              )
            ).confirmed_total,
            29880,
          );
        },
      );
      await t.test(
        'Programar no crea compras; confirmar una vez recalcula y avanza la fecha',
        async () => {
          const before = (await good(client.from('orders').select('id'))).length;
          for (const frequency of ['weekly', 'biweekly', 'monthly'])
            schedules.push(
              await good(
                client.rpc('create_schedule', {
                  p_order_id: oid,
                  p_frequency: frequency,
                  p_next_due_date: date,
                }),
              ),
            );
          assert.equal((await good(client.from('orders').select('id'))).length, before);
          const newId = await good(
            client.rpc('submit_order', { ...draft, p_schedule_id: schedules[1] }),
          );
          orders.push(newId);
          const newOrder = await good(client.from('orders').select('*').eq('id', newId).single());
          assert.equal(newOrder.status, 'requested');
          assert.equal(newOrder.confirmed_total, null);
          assert.equal(newOrder.estimated_total, 32500);
          const snapshots = await good(
            client
              .from('order_items')
              .select('order_id,unit_weight_kg,product_name')
              .in('order_id', [oid, newId]),
          );
          assert.equal(snapshots.find((i) => i.order_id === oid).unit_weight_kg, 50);
          assert.equal(
            snapshots.find((i) => i.order_id === oid).product_name,
            'Producto de prueba',
          );
          assert.equal(snapshots.find((i) => i.order_id === newId).unit_weight_kg, 25);
          assert.ok(
            (await client.rpc('submit_order', { ...draft, p_schedule_id: schedules[1] })).error,
          );
          const due = await good(
            client.from('recurring_schedules').select('*').eq('id', schedules[1]).single(),
          );
          const expected = new Date(`${date}T12:00:00Z`);
          expected.setUTCDate(expected.getUTCDate() + 15);
          assert.equal(due.next_due_date, expected.toISOString().slice(0, 10));
          await good(client.rpc('manage_schedule', { p_id: schedules[0], p_action: 'skip' }));
          assert.equal((await good(client.from('orders').select('id'))).length, before + 1);
        },
      );
      await t.test(
        'Se retira la configuración de beneficios y se respeta la disponibilidad',
        async () => {
          assert.ok((await client.from('volume_discount_tiers').select('*')).error);
          assert.ok((await admin.rpc('update_discount_tiers', { p_tiers: [] })).error);
          await good(admin.from('products').update({ active: false }).eq('id', pid));
          assert.equal((await good(client.from('products').select('*').eq('id', pid))).length, 0);
          assert.ok((await client.rpc('submit_order', draft)).error);
        },
      );
    } finally {
      if (schedules.length) {
        await root.from('recurring_schedule_items').delete().in('schedule_id', schedules);
        await root.from('recurring_schedules').delete().in('id', schedules);
      }
      if (orders.length) {
        await root.from('payments').delete().in('order_id', orders);
        await root.from('order_items').delete().in('order_id', orders);
        await root.from('orders').delete().in('id', orders);
      }
      await root.from('products').delete().eq('id', pid);
      await root.from('clients').delete().eq('id', cid);
      if (otherCreated) await root.auth.admin.deleteUser(uid);
    }
  },
);
