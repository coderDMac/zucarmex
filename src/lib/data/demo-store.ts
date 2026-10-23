import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDemoStore, DemoStore } from './demo-seed';
const file = path.join(process.cwd(), '.demo', 'data.json');
// La demo local es de un solo proceso. Las escrituras se serializan y se reemplazan de forma atómica.
const scope = globalThis as typeof globalThis & { zucarmexQueue?: Promise<unknown> };
export async function readDemo(): Promise<DemoStore> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
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
