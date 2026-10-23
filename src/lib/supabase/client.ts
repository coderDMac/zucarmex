'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabaseKey } from './config';
export function supabaseBrowser() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase no está configurado.');
  return createBrowserClient(supabaseUrl, supabaseKey);
}
