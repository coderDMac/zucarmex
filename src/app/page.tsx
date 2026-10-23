import { redirect } from 'next/navigation';
import { session } from '@/lib/auth';
export default async function Home() {
  const auth = await session();
  redirect(auth?.profile.role === 'admin' ? '/admin' : auth ? '/portal' : '/login');
}
