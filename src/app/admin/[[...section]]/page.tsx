import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getPortalData } from '@/lib/data/repository';
import { AdminDashboard, AdminProducts, AdminClients, AdminBenefits } from '@/components/admin';
import { OrderList } from '@/components/order-list';
import { OrderDetail } from '@/components/order-detail';
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  await requireRole('admin');
  const data = await getPortalData();
  const { section = [] } = await params;
  const [page, id] = section;
  if (section.length > 2) notFound();
  if (!page) return <AdminDashboard data={data} />;
  if (page === 'pedidos' && id) {
    const order = data.orders.find((o) => o.id === id);
    if (!order) notFound();
    return <OrderDetail key={order.id} data={data} order={order} admin />;
  }
  if (id) notFound();
  if (page === 'pedidos') return <OrderList data={data} admin />;
  if (page === 'productos') return <AdminProducts data={data} />;
  if (page === 'clientes') return <AdminClients data={data} />;
  if (page === 'beneficios') return <AdminBenefits data={data} />;
  notFound();
}
