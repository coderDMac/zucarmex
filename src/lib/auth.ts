import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Profile, Role } from './domain/types';
import { hasSupabase, localDemoEnabled } from './supabase/config';
import { supabaseServer } from './supabase/server';
import { readDemo } from './data/demo-store';
export const session = cache(async (): Promise<{ profile: Profile; demo: boolean } | null> => {
  if (localDemoEnabled) {
    const role = (await cookies()).get('zuc-demo-role')?.value;
    if (role !== 'client' && role !== 'admin') return null;
    const store = await readDemo();
    return { profile: store.profiles.find((p) => p.role === role)!, demo: true };
  }
  if (!hasSupabase) return null;
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;
  const { data } = await db
    .from('profiles')
    .select('id,full_name,role,phone')
    .eq('id', user.id)
    .single();
  if (!data || !['client', 'admin'].includes(data.role)) return null;
  return { profile: data as Profile, demo: false };
});
export async function requireRole(role: Role) {
  const auth = await session();
  if (!auth) redirect('/login');
  if (auth.profile.role !== role) redirect(auth.profile.role === 'admin' ? '/admin' : '/portal');
  return auth;
}
