import test from 'node:test';
import assert from 'node:assert/strict';
import { discountFor, priceOrder, validateTiers } from '../src/lib/domain/pricing';
import { advanceSchedule, nextDate, validateFutureDate } from '../src/lib/domain/dates';
import { demoProducts, demoTiers } from '../src/lib/data/demo-seed';
test('La recompra de 20 a 25 sacos aplica 4% y estima $29,880', () => {
  const product = demoProducts[0];
  assert.equal(discountFor(20, demoTiers), 2);
  const result = priceOrder([{ product_id: product.id, quantity: 25 }], demoProducts, demoTiers);
  assert.equal(result.lines[0].volume_discount_percent, 4);
  assert.equal(result.subtotal, 31125);
  assert.equal(result.discount, 1245);
  assert.equal(result.total, 29880);
});
test('Los límites de volumen y productos independientes conservan sus beneficios', () => {
  assert.deepEqual(
    [1, 9, 10, 24, 25, 49, 50, 100].map((q) => discountFor(q, demoTiers)),
    [0, 0, 2, 2, 4, 4, 6, 6],
  );
  const result = priceOrder(
    [
      { product_id: demoProducts[0].id, quantity: 9 },
      { product_id: demoProducts[1].id, quantity: 1 },
    ],
    demoProducts,
    demoTiers,
  );
  assert.ok(result.lines.every((l) => l.volume_discount_percent === 0));
  assert.throws(() =>
    priceOrder([{ product_id: demoProducts[0].id, quantity: 1.5 }], demoProducts, demoTiers),
  );
  assert.throws(() =>
    priceOrder([{ product_id: 'inactive', quantity: 2 }], demoProducts, demoTiers),
  );
});
test('Las recurrencias manejan fin de mes y avanzan hasta una fecha futura', () => {
  assert.equal(nextDate('2026-10-23', 'biweekly'), '2026-11-07');
  assert.equal(nextDate('2028-01-31', 'monthly'), '2028-02-29');
  assert.equal(advanceSchedule('2026-09-01', 'weekly', '2026-10-23'), '2026-10-27');
  assert.throws(() => validateFutureDate('2028-02-31'));
});
test('Las reglas comerciales rechazan huecos, traslapes y porcentajes inválidos', () => {
  assert.doesNotThrow(() => validateTiers(demoTiers));
  assert.throws(() =>
    validateTiers(demoTiers.map((t, i) => (i === 1 ? { ...t, min_quantity: 9 } : t))),
  );
  assert.throws(() =>
    validateTiers(demoTiers.map((t, i) => (i === 3 ? { ...t, discount_percent: 101 } : t))),
  );
});
