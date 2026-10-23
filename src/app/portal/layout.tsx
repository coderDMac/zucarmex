import { requireRole } from '@/lib/auth';
import { getPortalData } from '@/lib/data/repository';
import { Shell } from '@/components/shell';
import { today } from '@/lib/domain/dates';
export const dynamic = 'force-dynamic';
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole('client');
  const data = await getPortalData();
  return (
    <Shell
      profile={data.profile}
      business={data.client?.business_name ?? 'Mi negocio'}
      demo={data.demo}
      due={data.schedules.filter((s) => s.active && s.next_due_date <= today()).length}
    >
      {children}
    </Shell>
  );
}
