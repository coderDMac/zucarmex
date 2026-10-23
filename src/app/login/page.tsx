import { redirect } from 'next/navigation';
import { session } from '@/lib/auth';
import { hasSupabase, localDemoEnabled } from '@/lib/supabase/config';
import { LoginForm } from '@/components/login-form';
export const dynamic = 'force-dynamic';
export default async function Login() {
  const auth = await session();
  if (auth) redirect(auth.profile.role === 'admin' ? '/admin' : '/portal');
  return <LoginForm configured={hasSupabase} demoEnabled={localDemoEnabled} />;
}
