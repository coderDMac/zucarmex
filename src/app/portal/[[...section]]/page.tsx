import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getPortalData } from '@/lib/data/repository';
import { Dashboard } from '@/components/dashboard';
import { Catalog } from '@/components/catalog';
import { OrderWizard } from '@/components/order-wizard';
import { OrderDetail } from '@/components/order-detail';
import { OrderList } from '@/components/order-list';
import { Recurring } from '@/components/recurring';
import { Help, ProfilePage } from '@/components/profile-help';
import { OrderDraft } from '@/lib/domain/types';
export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole('client');
  const data = await getPortalData();
  const { section = [] } = await params;
  const query = await searchParams;
  const [page, id] = section;
  if (section.length > 2) notFound();
  if (!page) return <Dashboard data={data} />;
  if (page === 'pedidos' && id) {
    const order = data.orders.find((o) => o.id === id);
    if (!order) notFound();
    return <OrderDetail key={order.id} data={data} order={order} created={query.created === '1'} />;
  }
  if (id) notFound();
  if (page === 'catalogo') return <Catalog data={data} />;
  if (page === 'nuevo-pedido') {
    const repeatId = typeof query.repeat === 'string' ? query.repeat : undefined;
    const scheduleId = typeof query.schedule === 'string' ? query.schedule : undefined;
    if (
      (repeatId && !data.orders.some((o) => o.id === repeatId)) ||
      (scheduleId && !data.schedules.some((s) => s.id === scheduleId))
    )
      notFound();
    let items: OrderDraft['items'] | undefined;
    if (typeof query.items === 'string') {
      try {
        const parsed = JSON.parse(query.items);
        if (Array.isArray(parsed) && parsed.length <= 50) {
          const unique = new Set();
          items = parsed.filter(
            (i) =>
              i &&
              typeof i.product_id === 'string' &&
              data.products.some((p) => p.id === i.product_id && p.active) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 10000 &&
              !unique.has(i.product_id) &&
              unique.add(i.product_id),
          );
        }
      } catch {
        /* Un enlace inválido abre una solicitud vacía. */
      }
    }
    return (
      <OrderWizard
        key={repeatId ?? scheduleId ?? query.items?.toString() ?? 'new'}
        data={data}
        repeatId={repeatId}
        scheduleId={scheduleId}
        initialItems={items}
      />
    );
  }
  if (page === 'pedidos') return <OrderList data={data} />;
  if (page === 'recurrentes') return <Recurring data={data} />;
  if (page === 'ayuda') return <Help />;
  if (page === 'perfil') return <ProfilePage data={data} />;
  notFound();
}
