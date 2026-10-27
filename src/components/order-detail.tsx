'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiMapPin,
  FiPackage,
  FiRepeat,
  FiShield,
  FiTruck,
} from 'react-icons/fi';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PortalData,
  paymentLabels,
  progression,
  statusLabels,
} from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/dates';
import { confirmationLineTotal, money, roundMoney } from '@/lib/domain/pricing';
import { api } from '@/lib/api';
import { Badge, ErrorMessage, Modal, Notice, Reveal, useTask } from './ui';
import { PageHeading } from './shell';
import { ScheduleModal } from './recurring';
import { PaymentOptions } from './payment-options';
import {
  itemName,
  itemPresentation,
  orderVolume,
  paymentMethodFor,
  tonnesLabel,
} from '@/lib/domain/history';
function PaymentModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const task = useTask();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>(order.payment_method ?? 'bank_transfer');
  const [paid, setPaid] = useState(false);
  return (
    <Modal title={paid ? 'Pago registrado' : 'Pago simulado'} onClose={onClose}>
      {paid ? (
        <>
          <div className="success-icon">
            <FiCheck />
          </div>
          <Notice tone="success">Pago registrado para fines demostrativos</Notice>
          <p className="modal-description">
            No se procesó dinero real. El registro demostrativo está disponible en el detalle de tu
            pedido.
          </p>
          <button className="button primary full" onClick={onClose}>
            Volver al seguimiento
          </button>
        </>
      ) : (
        <>
          <p className="modal-description">
            {order.order_number} · Selecciona un método para completar la demostración.
          </p>
          <div className="modal-total">
            <span>Total confirmado</span>
            <strong>
              {money(order.confirmed_total!)} <small style={{ fontSize: 10 }}>MXN</small>
            </strong>
          </div>
          <PaymentOptions value={method} onChange={setMethod} disabled={task.pending} />
          <Notice>
            Esta operación es una simulación académica. No ingreses datos bancarios ni de tarjetas.
          </Notice>
          <ErrorMessage message={task.error} />
          <button
            className="button primary full"
            disabled={task.pending}
            onClick={() =>
              task.run(async () => {
                await api(`orders/${order.id}/payment`, { method });
                setPaid(true);
                router.refresh();
              })
            }
          >
            {task.pending ? 'Registrando…' : 'Simular pago'}
            <FiCreditCard />
          </button>
        </>
      )}
    </Modal>
  );
}
export function OrderDetail({
  data,
  order,
  admin = false,
  created = false,
}: {
  data: PortalData;
  order: Order;
  admin?: boolean;
  created?: boolean;
}) {
  const router = useRouter();
  const task = useTask();
  const [payment, setPayment] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      order.items.map((i) => [i.id, i.confirmed_unit_price ?? i.reference_unit_price]),
    ),
  );
  const [available, setAvailable] = useState(order.confirmed_total !== null);
  const [incident, setIncident] = useState(order.incident_note ?? '');
  const [saved, setSaved] = useState(false);
  const total = roundMoney(
    order.items.reduce((s, i) => s + confirmationLineTotal(i, prices[i.id] || 0), 0),
  );
  const confirmedStages = ['confirmed', 'preparing', 'ready', 'delivered'];
  const canPay =
    confirmedStages.includes(order.status) &&
    order.confirmed_total !== null &&
    order.payment_status === 'pending';
  const client = data.clients.find((c) => c.id === order.client_id);
  const selectedMethod = paymentMethodFor(order, data.payments);
  const volume = orderVolume(order.items);
  const recorded = data.payments.find((p) => p.order_id === order.id);
  const closed = ['delivered', 'cancelled'].includes(order.status);
  if (created && !admin)
    return (
      <Reveal className="card confirmation">
        <div className="success-icon">
          <FiCheck />
        </div>
        <div className="eyebrow">TU SOLICITUD YA ESTÁ EN CAMINO</div>
        <h1>Solicitud recibida</h1>
        <div className="order-reference">{order.order_number}</div>
        <p>ZUCARMEX confirmará disponibilidad, precio final y condiciones comerciales.</p>
        <Notice>
          El total estimado es {money(order.estimated_total)} MXN. Tu precio final y fecha se
          confirmarán al procesar la solicitud.
        </Notice>
        <div className="button-row content-spacer">
          <Link className="button primary" href={`/portal/pedidos/${order.id}`}>
            Ver seguimiento <FiArrowRight />
          </Link>
          <Link className="button light" href="/portal">
            Volver al inicio
          </Link>
        </div>
      </Reveal>
    );
  return (
    <>
      <Link className="back-link" href={`${admin ? '/admin' : '/portal'}/pedidos`}>
        <FiArrowLeft />
        {admin ? 'Todas las solicitudes' : 'Mis pedidos'}
      </Link>
      <PageHeading
        eyebrow={
          admin ? (client?.business_name ?? 'SOLICITUD DE CLIENTE') : 'CADA PASO, A LA VISTA'
        }
        title={`Pedido ${order.order_number}`}
        description={`Solicitud del ${dateLabel(order.created_at)} · ${order.items.reduce((s, i) => s + i.quantity, 0)} unidades`}
        action={
          admin ? (
            <Badge status={order.status} />
          ) : (
            <Link className="button light" href={`/portal/nuevo-pedido?repeat=${order.id}`}>
              <FiRepeat />
              Repetir pedido
            </Link>
          )
        }
      />
      <div className={`detail-grid ${admin ? 'admin-detail' : ''}`}>
        <div className="detail-main">
          <Reveal className="card card-pad">
            <div className="card-top">
              <div className="card-title">
                <FiTruck />
                Seguimiento del pedido
              </div>
              <Badge status={order.status} />
            </div>
            {['incident', 'cancelled'].includes(order.status) ? (
              <Notice tone="warning">
                {order.status === 'incident'
                  ? `Incidencia: ${order.incident_note ?? 'Tu asesor revisará este pedido contigo.'}`
                  : 'Este pedido fue cancelado. Contacta a tu asesor si necesitas una aclaración.'}
              </Notice>
            ) : (
              <div className="timeline">
                {progression.map((s, i) => {
                  const index = progression.indexOf(order.status);
                  return (
                    <div
                      className={`timeline-node ${i < index ? 'done' : i === index ? 'now' : ''}`}
                      key={s}
                    >
                      <span>{i < index ? <FiCheck /> : i + 1}</span>
                      <div>
                        <h4>{statusLabels[s]}</h4>
                        {i === index && (
                          <p>
                            {s === 'requested'
                              ? 'Recibimos tu intención de compra. La disponibilidad y el precio están pendientes de validación.'
                              : s === 'confirmed'
                                ? 'Disponibilidad y precio confirmados. Ya puedes registrar tu pago simulado.'
                                : s === 'delivered'
                                  ? 'Gracias por seguir creando con nosotros.'
                                  : `Última actualización: ${dateLabel(order.updated_at)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="detail-meta">
              <div>
                <small>Fecha requerida</small>
                <strong>{dateLabel(order.requested_date)}</strong>
              </div>
              <div>
                <small>Modalidad</small>
                <strong>
                  {order.fulfillment_type === 'pickup'
                    ? 'Recolección en Culiacán'
                    : 'Entrega en dirección'}
                </strong>
              </div>
              <div>
                <small>Método de pago</small>
                <strong>{selectedMethod ? paymentLabels[selectedMethod] : 'Por definir'}</strong>
              </div>
              <div>
                <small>Estado del pago</small>
                <strong>
                  {order.payment_status === 'simulated_paid'
                    ? 'Pago simulado registrado'
                    : 'Pendiente'}
                </strong>
              </div>
            </div>
            {order.fulfillment_type === 'delivery' && (
              <div className="info-row">
                <small>Dirección solicitada</small>
                {order.delivery_address}
              </div>
            )}
          </Reveal>
          <Reveal className="card table-card" delay={0.06}>
            <div className="card-top" style={{ padding: '22px 23px 0' }}>
              <div className="card-title">
                <FiPackage />
                Productos solicitados
              </div>
              <span className="subtle">{order.items.length} producto(s)</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto / cantidad</th>
                    <th>Referencia</th>
                    <th>Volumen</th>
                    <th>
                      {admin
                        ? 'Precio confirmado / saco'
                        : order.confirmed_total !== null
                          ? 'Importe confirmado'
                          : 'Importe estimado'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="table-product">
                        <strong>{itemName(i, data.products)}</strong>
                        <small>
                          {i.quantity} unidades · {itemPresentation(i, data.products)}
                        </small>
                      </td>
                      <td>{money(i.reference_unit_price)}</td>
                      <td>
                        {i.unit_weight_kg === null || i.unit_weight_kg === undefined
                          ? 'Peso no registrado'
                          : tonnesLabel(orderVolume([i]).tonnes)}
                      </td>
                      <td>
                        {admin ? (
                          <input
                            className="price-edit"
                            type="number"
                            min="0.01"
                            step="0.01"
                            max="1000000"
                            aria-label={`Precio confirmado de ${data.products.find((p) => p.id === i.product_id)?.name ?? 'producto'}`}
                            value={prices[i.id]}
                            disabled={order.payment_status === 'simulated_paid' || closed}
                            onChange={(e) => {
                              setPrices({ ...prices, [i.id]: Number(e.target.value) });
                              setSaved(false);
                            }}
                          />
                        ) : (
                          money(i.confirmed_line_total ?? i.estimated_line_total)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '15px 22px' }}>
              <p className="subtle">
                Los precios y las presentaciones corresponden al momento de la solicitud. El importe
                confirmado conserva las condiciones comerciales del pedido.
              </p>
            </div>
          </Reveal>
        </div>
        <aside className="detail-side">
          {admin ? (
            <div className="card">
              <div className="card-title">
                <FiShield />
                Gestión de la solicitud
              </div>
              <p className="subtle" style={{ margin: '9px 0 20px' }}>
                Confirma disponibilidad y revisa el precio por unidad. Las condiciones comerciales
                se acuerdan para cada pedido.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  task.run(async () => {
                    await api(`orders/${order.id}/admin`, {
                      status,
                      prices,
                      incident_note: incident,
                      availability: available,
                    });
                    setSaved(true);
                    router.refresh();
                  });
                }}
              >
                <label className="field">
                  Estado del pedido
                  <select
                    value={status}
                    disabled={closed}
                    onChange={(e) => {
                      setStatus(e.target.value as OrderStatus);
                      setSaved(false);
                    }}
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {confirmedStages.includes(status) && (
                  <>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={available}
                        required
                        onChange={(e) => setAvailable(e.target.checked)}
                        disabled={closed}
                      />
                      Confirmo disponibilidad de todos los productos.
                    </label>
                    <div className="summary-line total">
                      <span>Total a confirmar</span>
                      <strong>{money(total)}</strong>
                    </div>
                  </>
                )}
                {status === 'incident' && (
                  <label className="field">
                    Descripción de la incidencia
                    <textarea
                      minLength={5}
                      maxLength={1000}
                      required
                      value={incident}
                      onChange={(e) => setIncident(e.target.value)}
                    />
                  </label>
                )}
                <ErrorMessage message={task.error} />
                {saved && (
                  <Notice tone="success">
                    Pedido actualizado. El cliente verá el cambio al refrescar.
                  </Notice>
                )}
                <button className="button primary full" disabled={task.pending || closed}>
                  {task.pending
                    ? 'Guardando…'
                    : status === 'confirmed'
                      ? 'Confirmar pedido'
                      : 'Guardar cambios'}
                  <FiCheck />
                </button>
              </form>
            </div>
          ) : (
            <div className="card">
              <div className="card-title">
                <FiFileText />
                Resumen del pedido
              </div>
              <div className="summary-line">
                <span>Subtotal de referencia</span>
                <strong>{money(order.reference_subtotal)}</strong>
              </div>

              <div className="summary-line">
                <span>Total estimado</span>
                <strong>{money(order.estimated_total)}</strong>
              </div>
              {order.confirmed_total !== null ? (
                <>
                  <span className="summary-label">Precio confirmado</span>
                  <div className="side-total">
                    {money(order.confirmed_total)} <small style={{ fontSize: 10 }}>MXN</small>
                  </div>
                </>
              ) : (
                <Notice>El precio final está pendiente de confirmación por ZUCARMEX.</Notice>
              )}
              <div className="payment-method-summary">
                <span className="summary-label">Método de pago seleccionado</span>
                <strong>{selectedMethod ? paymentLabels[selectedMethod] : 'Por definir'}</strong>
                <p>
                  {tonnesLabel(volume.tonnes)} · {volume.units} unidades
                  {volume.unweighedUnits ? ' · volumen parcial' : ''}
                </p>
              </div>
              {order.payment_status === 'simulated_paid' ? (
                <>
                  <div className="payment-success">
                    <FiCheckCircle />
                    Pago registrado para fines demostrativos
                  </div>
                  {recorded && (
                    <p className="subtle">
                      {paymentLabels[recorded.payment_method]} · {dateLabel(recorded.created_at)}
                    </p>
                  )}
                </>
              ) : canPay ? (
                <button className="button primary full" onClick={() => setPayment(true)}>
                  <FiCreditCard />
                  Ir a pago simulado
                </button>
              ) : (
                <button className="button light full" disabled>
                  <FiCreditCard />
                  Pago disponible al confirmar
                </button>
              )}
            </div>
          )}
          {admin ? (
            <div className="card">
              <div className="card-title">
                <FiMapPin />
                Negocio cliente
              </div>
              <h3 style={{ marginTop: 18 }}>{client?.business_name}</h3>
              <p className="subtle" style={{ marginTop: 7 }}>
                {client?.phone}
              </p>
              <p className="subtle" style={{ marginTop: 7 }}>
                {client?.address}, {client?.city}
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="card-title">
                <FiRepeat />
                Tu próxima compra, planeada
              </div>
              <p className="subtle" style={{ marginTop: 12, lineHeight: 1.8 }}>
                Convierte este pedido en una programación. Siempre tendrás la última palabra antes
                de solicitarlo.
              </p>
              <button className="button light full" onClick={() => setSchedule(true)}>
                Programar pedido recurrente
              </button>
              <Link href="/portal/ayuda" className="text-link" style={{ marginTop: 19 }}>
                ¿Necesitas ayuda? <FiArrowRight />
              </Link>
            </div>
          )}
        </aside>
      </div>
      {payment && <PaymentModal order={order} onClose={() => setPayment(false)} />}
      {schedule && <ScheduleModal orderId={order.id} onClose={() => setSchedule(false)} />}
    </>
  );
}
