'use client';
import Link from 'next/link';
import { FiArrowUpRight } from 'react-icons/fi';
import { Client, Order, Payment, Product, paymentLabels } from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/dates';
import { itemName, orderVolume, paymentMethodFor, volumeLabel } from '@/lib/domain/history';
import { money } from '@/lib/domain/pricing';
import { Badge, Empty } from './ui';
export function OrderTable({
  orders,
  products,
  clients = [],
  payments = [],
  admin = false,
}: {
  orders: Order[];
  products: Product[];
  clients?: Client[];
  payments?: Payment[];
  admin?: boolean;
}) {
  if (!orders.length)
    return (
      <div className="card">
        <Empty title="No hay pedidos para mostrar">
          {admin ? (
            'Las solicitudes que coincidan con la búsqueda aparecerán aquí.'
          ) : (
            <>
              Revisa los filtros o prepara una nueva solicitud.
              <br />
              <Link className="button primary content-spacer" href="/portal/nuevo-pedido">
                Nuevo pedido
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
          <caption className="sr-only">
            Histórico de pedidos, importes, toneladas y métodos de pago
          </caption>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>{admin ? 'Cliente' : 'Productos'}</th>
              <th>Fecha requerida</th>
              <th>Unidades / toneladas</th>
              <th>Monto</th>
              <th>Método de pago</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Ver detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const volume = orderVolume(order.items);
              const method = paymentMethodFor(order, payments);
              const href = `${admin ? '/admin' : '/portal'}/pedidos/${order.id}`;
              return (
                <tr key={order.id} className="row-link">
                  <td>
                    <Link className="order-cell" href={href}>
                      {order.order_number}
                    </Link>
                    <div className="subtle table-subline">{dateLabel(order.created_at)}</div>
                  </td>
                  <td className="table-product">
                    {admin
                      ? (clients.find((c) => c.id === order.client_id)?.business_name ?? 'Cliente')
                      : order.items[0]
                        ? itemName(order.items[0], products)
                        : 'Producto'}
                    <small>
                      {admin
                        ? 'Punto de Venta Culiacán'
                        : order.items.length > 1
                          ? `${order.items.length} productos`
                          : '1 producto'}
                    </small>
                  </td>
                  <td>{dateLabel(order.requested_date)}</td>
                  <td>
                    <strong>{volume.units} unidades</strong>
                    <div className="subtle table-subline">{volumeLabel(volume)}</div>
                  </td>
                  <td className="table-total">
                    {money(order.confirmed_total ?? order.estimated_total)}
                    <div className="subtle table-subline">
                      {order.confirmed_total !== null ? 'Confirmado' : 'Estimado'}
                    </div>
                  </td>
                  <td className="table-product">
                    {method ? paymentLabels[method] : 'Por definir'}
                    <small>
                      {order.payment_status === 'simulated_paid'
                        ? 'Pago simulado registrado'
                        : 'Pendiente'}
                    </small>
                  </td>
                  <td>
                    <Badge status={order.status} />
                  </td>
                  <td>
                    <Link
                      href={href}
                      className="icon-button table-arrow"
                      aria-label={`Ver pedido ${order.order_number}`}
                    >
                      <FiArrowUpRight />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
