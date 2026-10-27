import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmationLineTotal, priceOrder } from '../src/lib/domain/pricing';
import {
  advanceSchedule,
  businessDate,
  dateLabel,
  nextDate,
  validateFutureDate,
  today,
  addDays,
} from '../src/lib/domain/dates';
import { createDemoStore, demoProducts } from '../src/lib/data/demo-seed';
import {
  itemName,
  orderVolume,
  paymentMethodFor,
  purchaseHistory,
  volumeLabel,
} from '../src/lib/domain/history';
import { validateDraft } from '../src/lib/domain/validation';
import type { Order } from '../src/lib/domain/types';

test('25 sacos usan la referencia vigente sin beneficios automáticos: $31,125 y 1.25 t', () => {
  const result = priceOrder([{ product_id: demoProducts[0].id, quantity: 25 }], demoProducts);
  assert.equal(result.total, 31125);
  assert.equal(result.subtotal, result.total);
  assert.equal(result.lines[0].volume_discount_percent, 0);
  assert.deepEqual(orderVolume(result.lines), { units: 25, tonnes: 1.25, unweighedUnits: 0 });
});

test('Las referencias nuevas se recalculan y los snapshots históricos conservan peso y nombre', () => {
  const original = priceOrder([{ product_id: demoProducts[0].id, quantity: 20 }], demoProducts);
  const changed = demoProducts.map((product, index) =>
    index === 0
      ? { ...product, reference_price: 1300, unit_weight_kg: 25, name: 'Otra presentación' }
      : product,
  );
  const repeated = priceOrder([{ product_id: demoProducts[0].id, quantity: 20 }], changed);
  assert.equal(repeated.total, 26000);
  assert.equal(orderVolume(original.lines).tonnes, 1);
  assert.equal(orderVolume(repeated.lines).tonnes, 0.5);
  assert.equal(original.lines[0].product_name, 'Azúcar estándar');
  assert.throws(() =>
    priceOrder([{ product_id: demoProducts[0].id, quantity: 1.5 }], demoProducts),
  );
  assert.throws(() => priceOrder([{ product_id: 'inactivo', quantity: 2 }], demoProducts));
});

test('El volumen suma presentaciones distintas y distingue unidades sin peso', () => {
  assert.deepEqual(
    orderVolume([
      { quantity: 2, unit_weight_kg: 50 },
      { quantity: 4, unit_weight_kg: 25 },
      { quantity: 5, unit_weight_kg: 20 },
      { quantity: 3, unit_weight_kg: null },
    ]),
    { units: 14, tonnes: 0.3, unweighedUnits: 3 },
  );
});

test('El histórico usa ventas entregadas, importes confirmados y fecha de compra original', () => {
  const fixture = createDemoStore().orders[1];
  const order = (patch: Partial<Order>): Order => ({ ...fixture, ...patch });
  const older = order({
    id: 'anterior',
    created_at: '2026-09-01T16:00:00Z',
    updated_at: '2026-10-27T16:00:00Z',
    confirmed_total: 100,
  });
  const latest = order({
    id: 'ultima',
    created_at: '2026-10-15T16:00:00Z',
    updated_at: '2026-10-15T16:00:00Z',
    confirmed_total: 200,
  });
  const history = purchaseHistory([
    older,
    latest,
    order({
      id: 'cancelado',
      status: 'cancelled',
      created_at: '2026-10-27T16:00:00Z',
      confirmed_total: 9000,
    }),
    order({ id: 'solicitud', status: 'requested', confirmed_total: null }),
    order({ id: 'en-preparacion', status: 'preparing', confirmed_total: 5000 }),
    order({ id: 'sin-confirmar', status: 'delivered', confirmed_total: null }),
  ]);
  assert.equal(history.count, 2);
  assert.equal(history.amount, 300);
  assert.equal(history.tonnes, 2);
  assert.equal(history.latest?.id, 'ultima');
  assert.equal(purchaseHistory([]).latest, null);
  assert.equal(purchaseHistory([]).amount, 0);
  assert.equal(volumeLabel({ units: 3, tonnes: 0, unweighedUnits: 3 }), 'Peso pendiente');
  assert.equal(volumeLabel({ units: 3, tonnes: 0.05, unweighedUnits: 1 }), '0.05 t · parcial');
  assert.equal(volumeLabel({ units: 0, tonnes: 0, unweighedUnits: 0 }), '0 t');
});

test('Cambiar estado conserva importes históricos sin volver a aplicar descuentos', () => {
  const old = { quantity: 25, confirmed_unit_price: 1245, confirmed_line_total: 29880 };
  assert.equal(confirmationLineTotal(old, 1245), 29880);
  assert.equal(confirmationLineTotal(old, 1240), 31000);
  const first = { quantity: 25, confirmed_unit_price: null, confirmed_line_total: null };
  const amount = confirmationLineTotal(first, 1245);
  assert.equal(amount, 31125);
  assert.equal(
    confirmationLineTotal(
      { ...first, confirmed_unit_price: 1245, confirmed_line_total: amount },
      1245,
    ),
    31125,
  );
});

test('El método se valida al solicitar y el registro pagado conserva el método efectivo', () => {
  const store = createDemoStore();
  const order = { ...store.orders[1], payment_method: 'authorized_credit' as const };
  assert.equal(paymentMethodFor(order, store.payments), 'bank_transfer');
  assert.equal(paymentMethodFor(order, []), 'authorized_credit');
  const draft = {
    items: [{ product_id: demoProducts[0].id, quantity: 1 }],
    requested_date: addDays(today(), 1),
    fulfillment_type: 'pickup',
    delivery_address: '',
    payment_method: 'point_of_sale',
  };
  assert.equal(validateDraft(draft).payment_method, 'point_of_sale');
  assert.throws(() => validateDraft({ ...draft, payment_method: 'stripe' }));
  assert.throws(() => validateDraft({ ...draft, payment_method: undefined }));
  assert.equal(itemName(store.orders[0].items[0], []), 'Azúcar estándar');
});

test('Las recurrencias y las fechas de Culiacán funcionan en límites de mes y de día', () => {
  assert.equal(nextDate('2026-10-23', 'biweekly'), '2026-11-07');
  assert.equal(nextDate('2028-01-31', 'monthly'), '2028-02-29');
  assert.equal(advanceSchedule('2026-09-01', 'weekly', '2026-10-23'), '2026-10-27');
  assert.equal(businessDate('2026-10-27T04:00:00Z'), '2026-10-26');
  assert.match(dateLabel('2026-10-27'), /27/);
  assert.throws(() => validateFutureDate('2028-02-31'));
});
