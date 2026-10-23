import { requireRole } from '@/lib/auth';
import { getPortalData } from '@/lib/data/repository';
import { Shell } from '@/components/shell';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');
  const data = await getPortalData();
  return (
    <Shell profile={data.profile} business="ZUCARMEX" demo={data.demo} due={0}>
      {children}
    </Shell>
  );
}
