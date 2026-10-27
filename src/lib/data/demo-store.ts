import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDemoStore, DemoStore, demoProducts } from './demo-seed';
const file = path.join(process.cwd(), '.demo', 'data.json');
// La demo local es de un solo proceso. Las escrituras se serializan y se reemplazan de forma atómica.
const scope = globalThis as typeof globalThis & { zucarmexQueue?: Promise<unknown> };
export async function readDemo(): Promise<DemoStore> {
  try {
    const data: DemoStore = JSON.parse(await readFile(file, 'utf8'));
    // Compatibilidad con demostraciones guardadas antes de incorporar pesos y métodos de pago.
    data.products.forEach((product) => {
      if (product.unit_weight_kg === undefined)
        product.unit_weight_kg =
          demoProducts.find((p) => p.id === product.id && p.presentation === product.presentation)
            ?.unit_weight_kg ?? null;
    });
    data.orders.forEach((order) => {
      if (order.payment_method === undefined)
        order.payment_method =
          data.payments.find((p) => p.order_id === order.id)?.payment_method ?? null;
      order.items.forEach((item) => {
        const product = data.products.find((p) => p.id === item.product_id);
        item.product_name ??= product?.name ?? '';
        item.product_presentation ??= product?.presentation ?? '';
        if (item.unit_weight_kg === undefined)
          item.unit_weight_kg = product?.unit_weight_kg ?? null;
      });
    });
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return createDemoStore();
  }
}
export async function mutateDemo<T>(operation: (store: DemoStore) => T | Promise<T>): Promise<T> {
  const task = (scope.zucarmexQueue ?? Promise.resolve()).then(async () => {
    const data = await readDemo();
    const result = await operation(data);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.tmp`, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(`${file}.tmp`, file);
    return result;
  });
  scope.zucarmexQueue = task.catch(() => {});
  return task;
}
