import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl, supabaseKey } from './config';
export async function supabaseServer() {
  if (!supabaseUrl || !supabaseKey)
    throw new Error('Configura Supabase en .env.local para iniciar sesión.');
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* La renovación de sesión se realiza en proxy.ts. */
        }
      },
    },
  });
}
