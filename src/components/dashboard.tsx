'use client';
import Link from 'next/link';
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiInfo,
  FiPackage,
  FiPercent,
  FiPlus,
  FiRepeat,
  FiSun,
  FiTruck,
} from 'react-icons/fi';
import { PortalData, progression, statusLabels } from '@/lib/domain/types';
import { dateLabel, today } from '@/lib/domain/dates';
import { discountFor, volumeHint } from '@/lib/domain/pricing';
import { AnimatedPrice, Badge, Empty, Reveal } from './ui';
import { PageHeading } from './shell';
import { OrderTable } from './order-table';
export function Dashboard({ data }: { data: PortalData }) {
  const product = data.products[0];
  const last = data.orders.find((o) => o.status === 'delivered') ?? data.orders[0];
  const active = data.orders.find((o) => !['delivered', 'cancelled'].includes(o.status));
  const qty = last?.items[0]?.quantity ?? 20;
  const discount = discountFor(qty, data.tiers);
  const due = data.schedules.filter((s) => s.active && s.next_due_date <= today());
  return (
    <>
      <PageHeading
        eyebrow="TU NEGOCIO, SIEMPRE EN MARCHA"
        title={`Buenos días, ${data.client?.business_name ?? data.profile.full_name}`}
        description="Gestiona tus pedidos y anticipa tu abastecimiento."
        action={
          <Link href="/portal/nuevo-pedido" className="button primary">
            <FiPlus />
            Nuevo pedido
          </Link>
        }
      />
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
                <div className="presentation">{product.presentation} · Para seguir creando</div>
                <div className="hero-price">
                  <AnimatedPrice value={product.reference_price} />
                  <small>MXN / saco</small>
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
              Repite y ahorra tiempo
            </div>
            <FiArrowUpRight className="muted" />
          </div>
          {last ? (
            <>
              <div className="order-reference">{last.order_number}</div>
              <div className="reorder-date">Tu último pedido · {dateLabel(last.created_at)}</div>
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
                    {data.products.find((p) => p.id === last.items[0]?.product_id)?.name ??
                      'Producto demo'}
                  </strong>
                  <small>
                    {qty} sacos ·{' '}
                    {data.products.find((p) => p.id === last.items[0]?.product_id)?.presentation}
                    {last.items.length > 1 ? ` · +${last.items.length - 1} producto(s)` : ''}
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
        <Reveal className="card active-card" delay={0.1}>
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
                <small>{active.items.reduce((s, i) => s + i.quantity, 0)} unidades</small>
              </div>
              <div className="mini-progress">
                {progression.map((s, i) => {
                  const index = progression.indexOf(active.status);
                  return (
                    <div key={s} className={i < index ? 'complete' : i === index ? 'current' : ''}>
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
              <div className="active-card-bottom">
                <span>
                  <FiTruck />
                  {active.fulfillment_type === 'delivery'
                    ? 'Entrega solicitada'
                    : 'Recolección solicitada'}{' '}
                  · {dateLabel(active.requested_date, { day: 'numeric', month: 'short' })}
                </span>
                <Link className="text-link" href={`/portal/pedidos/${active.id}`}>
                  Ver seguimiento <FiArrowRight />
                </Link>
              </div>
            </>
          ) : (
            <Empty title="Todo al día">Tus próximos pedidos aparecerán aquí.</Empty>
          )}
        </Reveal>
        <Reveal className="card volume-card" delay={0.14}>
          <div className="card-title">
            <FiPercent />
            Más volumen, más beneficio
          </div>
          <span className="benefit-pill">
            <span className="status-dot" />
            Beneficio demostrativo
          </span>
          <div className="volume-big">
            <div className="percent-circle">{discount}%</div>
            <h3>{volumeHint(qty, data.tiers)}</h3>
          </div>
          <p>Calculado por producto. Planea tu siguiente compra y aprovecha el volumen.</p>
          <div className="tier-track">
            {data.tiers.map((t) => (
              <span key={t.id} className={qty >= t.min_quantity ? 'filled' : ''} />
            ))}
          </div>
          <div className="tier-labels">
            {data.tiers.map((t) => (
              <span key={t.id}>
                {t.max_quantity ? `${t.min_quantity}–${t.max_quantity}` : `${t.min_quantity}+`}{' '}
                sacos
              </span>
            ))}
          </div>
        </Reveal>
      </div>
      <div className="reference-footnote">
        <FiInfo />
        <span>
          Los precios mostrados son de referencia. El precio final será confirmado por ZUCARMEX al
          procesar el pedido. Productos, imágenes y descuentos demostrativos.
        </span>
      </div>
      {due.length > 0 ? (
        <Reveal className="recurring-banner" delay={0.18}>
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
        <h2>Tus pedidos recientes</h2>
        <Link className="text-link" href="/portal/pedidos">
          Ver todos los pedidos <FiArrowRight />
        </Link>
      </div>
      <Reveal delay={0.2}>
        <OrderTable orders={data.orders.slice(0, 3)} products={data.products} />
      </Reveal>
    </>
  );
}
