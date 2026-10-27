'use client';
import Link from 'next/link';
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiInfo,
  FiPackage,
  FiPlus,
  FiRepeat,
  FiSun,
  FiTruck,
} from 'react-icons/fi';
import { PortalData, paymentLabels, progression } from '@/lib/domain/types';
import { dateLabel, today } from '@/lib/domain/dates';
import { money } from '@/lib/domain/pricing';
import {
  itemName,
  orderVolume,
  paymentMethodFor,
  purchaseHistory,
  volumeLabel,
} from '@/lib/domain/history';
import { AnimatedPrice, Badge, Empty, Reveal } from './ui';
import { PageHeading } from './shell';
import { OrderTable } from './order-table';
import { HistorySummary } from './history-summary';
export function Dashboard({ data }: { data: PortalData }) {
  const product = data.products.find((p) => p.active);
  const history = purchaseHistory(data.orders);
  const last = history.latest ?? data.orders[0];
  const active = data.orders.find((order) => !['delivered', 'cancelled'].includes(order.status));
  const due = data.schedules.filter((s) => s.active && s.next_due_date <= today());
  const lastVolume = last ? orderVolume(last.items) : null;
  const method = active ? paymentMethodFor(active, data.payments) : null;
  return (
    <>
      <PageHeading
        eyebrow="TU NEGOCIO, SIEMPRE EN MARCHA"
        title={`Buenos días, ${data.client?.business_name ?? data.profile.full_name}`}
        description="Consulta tus compras, repite pedidos y anticipa tu abastecimiento."
        action={
          <Link href="/portal/nuevo-pedido" className="button primary">
            <FiPlus />
            Nuevo pedido
          </Link>
        }
      />
      <HistorySummary orders={data.orders} />
      <div className="dashboard-grid">
        <Reveal className="card price-hero">
          {product ? (
            <>
              <div className="hero-content">
                <div className="card-eyebrow">
                  <FiSun />
                  Tu precio de referencia <span className="tiny-badge">DEMO</span>
                </div>
                <h2>{product.name}</h2>
                <div className="presentation">
                  {product.presentation} · Precio vigente de referencia
                </div>
                <div className="hero-price">
                  <AnimatedPrice value={product.reference_price} />
                  <small>MXN / unidad</small>
                </div>
                <div className="hero-updated">
                  <FiClock />
                  Actualizado{' '}
                  {dateLabel(product.updated_at, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Mazatlan',
                  })}
                </div>
                <Link href="/portal/catalogo" className="button light small">
                  Consultar catálogo <FiArrowUpRight />
                </Link>
              </div>
              <img
                className="hero-bag"
                src={product.image_url || '/images/sugar-standard.svg'}
                alt={`Presentación demostrativa de ${product.name}`}
              />
            </>
          ) : (
            <Empty title="Catálogo en preparación">
              Tu asesor publicará productos próximamente.
            </Empty>
          )}
        </Reveal>
        <Reveal className="card reorder-card" delay={0.06}>
          <div className="card-top">
            <div className="card-title">
              <FiRepeat />
              {history.latest ? 'Tu última compra' : 'Tu pedido más reciente'}
            </div>
            <FiArrowUpRight className="muted" />
          </div>
          {last ? (
            <>
              <div className="last-purchase-heading">
                <div>
                  <div className="order-reference">{last.order_number}</div>
                  <div className="reorder-date">
                    {history.latest ? 'Compra del' : 'Solicitud del'} {dateLabel(last.created_at)}
                  </div>
                </div>
                <strong>{money(last.confirmed_total ?? last.estimated_total)}</strong>
              </div>
              <div className="reorder-product">
                <img
                  className="product-thumb"
                  src={
                    data.products.find((p) => p.id === last.items[0]?.product_id)?.image_url ||
                    '/images/sugar-standard.svg'
                  }
                  alt=""
                />
                <div>
                  <strong>
                    {last.items[0] ? itemName(last.items[0], data.products) : 'Productos'}
                  </strong>
                  <small>
                    {lastVolume?.units} unidades · {lastVolume ? volumeLabel(lastVolume) : '0 t'}
                    {last.items.length > 1 ? ` · ${last.items.length} productos` : ''}
                  </small>
                </div>
              </div>
              <Link className="button primary full" href={`/portal/nuevo-pedido?repeat=${last.id}`}>
                <FiRepeat />
                Repetir último pedido <FiArrowRight />
              </Link>
            </>
          ) : (
            <Empty title="Tu primera compra">Crea una solicitud para repetirla después.</Empty>
          )}
        </Reveal>
        <Reveal className="card active-card dashboard-active" delay={0.1}>
          <div className="active-heading">
            <div className="card-title">
              <FiPackage />
              Tu pedido en marcha
            </div>
            {active && <Badge status={active.status} />}
          </div>
          {active ? (
            <>
              <div className="order-inline">
                <span className="order-reference">{active.order_number}</span>
                <small>
                  {orderVolume(active.items).units} unidades ·{' '}
                  {volumeLabel(orderVolume(active.items))}
                </small>
              </div>
              <div className="mini-progress">
                {progression.map((status, i) => {
                  const index = progression.indexOf(active.status);
                  return (
                    <div
                      key={status}
                      className={i < index ? 'complete' : i === index ? 'current' : ''}
                    >
                      <i>{i < index ? <FiCheck /> : ''}</i>
                      {
                        [
                          'Recibido',
                          'Validación',
                          'Confirmado',
                          'Preparando',
                          'Listo',
                          'Entregado',
                        ][i]
                      }
                    </div>
                  );
                })}
              </div>
              <div className="active-payment">
                <span>
                  <FiCreditCard />
                  <strong>{method ? paymentLabels[method] : 'Método de pago por definir'}</strong>
                </span>
                <small>
                  {active.payment_status === 'simulated_paid'
                    ? 'Pago simulado registrado'
                    : 'Pago pendiente · disponible después de confirmar'}
                </small>
              </div>
              <div className="active-card-bottom">
                <span>
                  <FiTruck />
                  {active.fulfillment_type === 'delivery'
                    ? 'Entrega solicitada'
                    : 'Recolección solicitada'}{' '}
                  · {dateLabel(active.requested_date, { day: 'numeric', month: 'short' })}
                </span>
                <Link className="text-link" href={`/portal/pedidos/${active.id}`}>
                  Ver seguimiento y pago <FiArrowRight />
                </Link>
              </div>
            </>
          ) : (
            <Empty title="Todo al día">Tus próximos pedidos aparecerán aquí.</Empty>
          )}
        </Reveal>
      </div>
      <div className="reference-footnote">
        <FiInfo />
        <span>
          Los precios mostrados son de referencia y pueden variar. ZUCARMEX confirma disponibilidad,
          precio final y condiciones por pedido. Productos y precios demostrativos.
        </span>
      </div>
      {due.length > 0 ? (
        <Reveal className="recurring-banner" delay={0.15}>
          <div className="banner-icon">
            <FiRepeat />
          </div>
          <div>
            <h3>Tienes un pedido programado pendiente de confirmación.</h3>
            <p>Revisa productos, cantidades y precios vigentes antes de enviar tu solicitud.</p>
          </div>
          <Link href={`/portal/nuevo-pedido?schedule=${due[0].id}`} className="button light small">
            Revisar y confirmar <FiArrowRight />
          </Link>
        </Reveal>
      ) : (
        <div className="recurring-banner">
          <div className="banner-icon">
            <FiCalendar />
          </div>
          <div>
            <h3>Anticipa tu siguiente compra</h3>
            <p>Programa tu pedido habitual y confírmalo cuando llegue el momento.</p>
          </div>
          <Link className="button light small" href="/portal/recurrentes">
            Ver programaciones <FiArrowRight />
          </Link>
        </div>
      )}
      <div className="section-heading">
        <h2>Tu histórico de pedidos</h2>
        <Link className="text-link" href="/portal/pedidos">
          Consultar histórico completo <FiArrowRight />
        </Link>
      </div>
      <Reveal delay={0.18}>
        <OrderTable
          orders={data.orders.slice(0, 5)}
          products={data.products}
          payments={data.payments}
        />
      </Reveal>
    </>
  );
}
