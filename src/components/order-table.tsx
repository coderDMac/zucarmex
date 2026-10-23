'use client';
import Link from 'next/link';
import { FiArrowUpRight } from 'react-icons/fi';
import { Client, Order, Product } from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/dates';
import { money } from '@/lib/domain/pricing';
import { Badge, Empty } from './ui';
export function OrderTable({
  orders,
  products,
  clients = [],
  admin = false,
}: {
  orders: Order[];
  products: Product[];
  clients?: Client[];
  admin?: boolean;
}) {
  if (!orders.length)
    return (
      <div className="card">
        <Empty title="Aún no hay pedidos">
          {admin ? (
            'Las solicitudes de tus clientes aparecerán aquí.'
          ) : (
            <>
              Tu siguiente pedido comienza aquí.
              <br />
              <Link className="button primary content-spacer" href="/portal/nuevo-pedido">
                Crear mi primer pedido
              </Link>
            </>
          )}
        </Empty>
      </div>
    );
  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>{admin ? 'Cliente' : 'Productos'}</th>
              <th>{admin ? 'Fecha de solicitud' : 'Fecha requerida'}</th>
              {admin && <th>Fecha requerida</th>}
              <th>Total {admin ? 'estimado' : ''}</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Ver detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="row-link">
                <td>
                  <Link
                    className="order-cell"
                    href={`${admin ? '/admin' : '/portal'}/pedidos/${o.id}`}
                  >
                    {o.order_number}
                  </Link>
                  <div className="subtle" style={{ fontSize: 8, marginTop: 3 }}>
                    {dateLabel(o.created_at)}
                  </div>
                </td>
                <td className="table-product">
                  {admin
                    ? (clients.find((c) => c.id === o.client_id)?.business_name ?? 'Cliente')
                    : (products.find((p) => p.id === o.items[0]?.product_id)?.name ?? 'Producto')}
                  <small>
                    {admin
                      ? o.items.reduce((s, i) => s + i.quantity, 0) + ' unidades'
                      : o.items[0]?.quantity +
                        ' sacos' +
                        (o.items.length > 1 ? ` · +${o.items.length - 1} producto(s)` : '')}
                  </small>
                </td>
                <td>{dateLabel(admin ? o.created_at : o.requested_date)}</td>
                {admin && <td>{dateLabel(o.requested_date)}</td>}
                <td className="table-total">
                  {money(admin ? o.estimated_total : (o.confirmed_total ?? o.estimated_total))}
                  {!admin && (
                    <div className="subtle" style={{ fontSize: 8, fontWeight: 400 }}>
                      {o.confirmed_total !== null ? 'Confirmado' : 'Estimado'}
                    </div>
                  )}
                </td>
                <td>
                  <Badge status={o.status} />
                </td>
                <td>
                  <Link
                    href={`${admin ? '/admin' : '/portal'}/pedidos/${o.id}`}
                    className="icon-button table-arrow"
                    aria-label={`Ver pedido ${o.order_number}`}
                  >
                    <FiArrowUpRight />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
