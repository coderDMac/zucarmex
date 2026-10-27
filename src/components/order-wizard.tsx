'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCreditCard,
  FiCheck,
  FiMapPin,
  FiPackage,
  FiSend,
  FiTruck,
} from 'react-icons/fi';
import {
  PortalData,
  OrderDraft,
  PaymentMethod,
  paymentLabels,
  referenceNotice,
} from '@/lib/domain/types';
import { addDays, dateLabel, today, validateFutureDate } from '@/lib/domain/dates';
import { money, priceOrder } from '@/lib/domain/pricing';
import { api } from '@/lib/api';
import { ErrorMessage, Notice, Quantity, Reveal, useTask } from './ui';
import { PageHeading } from './shell';
import { PaymentOptions } from './payment-options';
import { orderVolume, tonnesLabel } from '@/lib/domain/history';
export function OrderWizard({
  data,
  repeatId,
  scheduleId,
  initialItems,
}: {
  data: PortalData;
  repeatId?: string;
  scheduleId?: string;
  initialItems?: OrderDraft['items'];
}) {
  const router = useRouter();
  const task = useTask();
  const schedule = data.schedules.find((s) => s.id === scheduleId);
  const repeat = data.orders.find((o) => o.id === repeatId);
  const source = schedule ?? repeat;
  const [step, setStep] = useState(0);
  const initial = initialItems ?? source?.items ?? [];
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initial
        .filter((i) => data.products.some((p) => p.id === i.product_id && p.active))
        .map((i) => [i.product_id, i.quantity]),
    ),
  );
  const [method, setMethod] = useState<PaymentMethod>(repeat?.payment_method ?? 'bank_transfer');
  const [date, setDate] = useState(addDays(today(), 1));
  const [fulfillment, setFulfillment] = useState<OrderDraft['fulfillment_type']>(
    source?.fulfillment_type ?? 'pickup',
  );
  const savedAddress = data.client
    ? `${data.client.address}, ${data.client.city}, ${data.client.state}, C.P. ${data.client.postal_code}`
    : '';
  const [address, setAddress] = useState(source?.delivery_address ?? savedAddress);
  const items = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([product_id, quantity]) => ({ product_id, quantity }));
  const pricing = priceOrder(items, data.products);
  function next() {
    task.setError('');
    try {
      if (step === 0 && !items.length)
        throw new Error('Agrega al menos un producto a tu solicitud.');
      if (step === 1) validateFutureDate(date);
      if (step === 2 && fulfillment === 'delivery' && address.trim().length < 10)
        throw new Error('Revisa la dirección de entrega.');
      setStep(step + 1);
    } catch (e) {
      task.setError((e as Error).message);
    }
  }
  if (scheduleId && (!schedule || !schedule.active || schedule.next_due_date > today()))
    return (
      <>
        <PageHeading
          title="Tu programación está al día"
          description="Todavía no hay una recurrencia pendiente de confirmación."
        />
        <Notice>La próxima solicitud estará disponible cuando llegue la fecha programada.</Notice>
        <Link className="button light content-spacer" href="/portal/recurrentes">
          Ver mis programaciones
        </Link>
      </>
    );
  return (
    <>
      <Link href={schedule ? '/portal/recurrentes' : '/portal'} className="back-link">
        <FiArrowLeft />
        {schedule ? 'Mis pedidos recurrentes' : 'Volver al inicio'}
      </Link>
      <PageHeading
        eyebrow={
          schedule
            ? 'ANTICIPA TU ABASTECIMIENTO'
            : repeat
              ? 'TU PEDIDO HABITUAL, MÁS FÁCIL'
              : 'UNA NUEVA SOLICITUD'
        }
        title={
          schedule
            ? 'Revisa tu pedido programado'
            : repeat
              ? 'Repite tu último pedido'
              : 'Nuevo pedido'
        }
        description={
          schedule
            ? 'Confirma tu intención de compra con los precios de referencia actuales.'
            : repeat
              ? `Productos de ${repeat.order_number}, con precios vigentes. Ajusta lo que necesites.`
              : 'Selecciona tus productos. Nosotros te acompañamos con el resto.'
        }
      />
      {initial.some((i) => !data.products.some((p) => p.id === i.product_id && p.active)) && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="warning">
            Algunos productos del pedido anterior están inactivos y se excluyeron de esta solicitud.
            Consulta a tu asesor para sustituirlos.
          </Notice>
        </div>
      )}
      <div className="wizard-layout">
        <Reveal className="card wizard-main">
          <div className="steps" aria-label={`Paso ${step + 1} de 4`}>
            {['Productos', 'Fecha', 'Entrega y pago', 'Resumen'].map((s, i) => (
              <div
                key={s}
                className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}
                aria-current={i === step ? 'step' : undefined}
              >
                <span>{i < step ? <FiCheck /> : i + 1}</span>
                {s}
              </div>
            ))}
          </div>
          {step === 0 && (
            <div>
              <h2 className="form-heading">¿Qué necesita tu negocio?</h2>
              <p className="form-subheading">
                Indica la cantidad por producto. El total utiliza el precio de referencia vigente y
                se confirma al procesar la solicitud.
              </p>
              <div className="wizard-products">
                {data.products
                  .filter((p) => p.active)
                  .map((p) => {
                    const line = pricing.lines.find((l) => l.product_id === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`wizard-product ${quantities[p.id] ? 'selected' : ''}`}
                      >
                        <img src={p.image_url || '/images/sugar-standard.svg'} alt="" />
                        <div className="wizard-product-info">
                          <h3>{p.name}</h3>
                          <p>
                            {p.presentation} · {money(p.reference_price)} MXN de referencia
                          </p>
                        </div>
                        {line && (
                          <span className="wizard-price">{money(line.estimated_line_total)}</span>
                        )}
                        <Quantity
                          value={quantities[p.id] ?? 0}
                          onChange={(n) => setQuantities({ ...quantities, [p.id]: n })}
                          label={`Cantidad de ${p.name}`}
                        />
                      </div>
                    );
                  })}
              </div>
              {!data.products.length && (
                <Notice>Tu asesor aún no publica productos disponibles.</Notice>
              )}
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="form-heading">Planea con anticipación</h2>
              <p className="form-subheading">Cuéntanos cuándo necesitarás tus productos.</p>
              <label className="field">
                Fecha requerida
                <input
                  type="date"
                  value={date}
                  min={addDays(today(), 1)}
                  required
                  onInput={(e) => setDate(e.currentTarget.value)}
                  onChange={(e) => setDate(e.target.value)}
                />
                <small>La disponibilidad y la fecha se validan al procesar la solicitud.</small>
              </label>
              <Notice tone="warning">
                Una solicitud futura no congela el precio actual. ZUCARMEX confirmará el precio
                final y las condiciones comerciales.
              </Notice>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="form-heading">¿Cómo recibirás y pagarás tu pedido?</h2>
              <p className="form-subheading">Elige la opción que funcione mejor para tu negocio.</p>
              <label className={`radio-card ${fulfillment === 'pickup' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === 'pickup'}
                  onChange={() => setFulfillment('pickup')}
                />
                <FiMapPin />
                <div>
                  <strong>Recoger en Punto de Venta Culiacán</strong>
                  <p>Tu asesor te avisará cuando el pedido esté listo.</p>
                </div>
              </label>
              <label className={`radio-card ${fulfillment === 'delivery' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="fulfillment"
                  checked={fulfillment === 'delivery'}
                  onChange={() => setFulfillment('delivery')}
                />
                <FiTruck />
                <div>
                  <strong>Entrega en dirección registrada</strong>
                  <p>La entrega está sujeta a confirmación comercial.</p>
                </div>
              </label>
              {fulfillment === 'delivery' && (
                <label className="field content-spacer">
                  Dirección para este pedido
                  <textarea
                    value={address}
                    minLength={10}
                    maxLength={500}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <small>
                    Puedes ajustarla para esta solicitud sin modificar tu dirección registrada.
                  </small>
                </label>
              )}
              <PaymentOptions value={method} onChange={setMethod} disabled={task.pending} />
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="form-heading">Todo listo para tu solicitud</h2>
              <p className="form-subheading">
                Revisa los detalles. El envío no representa una compra confirmada.
              </p>
              <div className="review-section">
                <h3>
                  <FiPackage />
                  Productos
                </h3>
                {pricing.lines.map((l) => (
                  <div key={l.product_id} className="summary-mini">
                    <div>
                      <strong>{data.products.find((p) => p.id === l.product_id)?.name}</strong>
                      <p className="subtle">
                        {l.quantity} unidades × {money(l.reference_unit_price)} ·{' '}
                        {tonnesLabel(orderVolume([l]).tonnes)}
                      </p>
                    </div>
                    <strong>{money(l.estimated_line_total)}</strong>
                  </div>
                ))}
              </div>
              <div className="field-grid review-section">
                <div>
                  <h3>
                    <FiCalendar />
                    Fecha requerida
                  </h3>
                  <div className="review-detail">
                    {dateLabel(date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <h3>{fulfillment === 'pickup' ? <FiMapPin /> : <FiTruck />}Modalidad</h3>
                  <div className="review-detail">
                    {fulfillment === 'pickup'
                      ? 'Recoger en Punto de Venta Culiacán'
                      : 'Entrega en dirección registrada'}
                    {fulfillment === 'delivery' && <p>{address}</p>}
                  </div>
                </div>
              </div>
              <div className="review-section">
                <h3>
                  <FiCreditCard />
                  Método de pago
                </h3>
                <div className="review-detail">
                  {paymentLabels[method]}
                  <p>
                    Selección para la solicitud. El pago se registra de forma simulada después de
                    confirmar.
                  </p>
                </div>
              </div>
              <Notice>{referenceNotice}</Notice>
            </div>
          )}
          <ErrorMessage message={task.error} />
          <div className="wizard-footer">
            {step > 0 && (
              <button
                className="button light"
                disabled={task.pending}
                onClick={() => {
                  task.setError('');
                  setStep(step - 1);
                }}
              >
                <FiArrowLeft />
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button className="button primary" onClick={next}>
                Continuar <FiArrowRight />
              </button>
            ) : (
              <button
                className="button primary"
                disabled={task.pending}
                onClick={() =>
                  task.run(async () => {
                    const result = await api('orders', {
                      items,
                      requested_date: date,
                      fulfillment_type: fulfillment,
                      delivery_address: address,
                      schedule_id: scheduleId,
                      payment_method: method,
                    });
                    router.push(`/portal/pedidos/${result.id}?created=1`);
                    router.refresh();
                  })
                }
              >
                {task.pending ? 'Enviando solicitud…' : 'Enviar solicitud'}
                <FiSend />
              </button>
            )}
          </div>
        </Reveal>
        <aside className="card summary-card">
          <h3>Tu solicitud, en resumen</h3>
          <div className="summary-items">
            {pricing.lines.length ? (
              pricing.lines.map((l) => (
                <div key={l.product_id} className="summary-mini">
                  <span>{data.products.find((p) => p.id === l.product_id)?.name}</span>
                  <strong>{l.quantity} unidades</strong>
                </div>
              ))
            ) : (
              <p className="subtle">Agrega productos para comenzar.</p>
            )}
          </div>
          <div className="summary-line">
            <span>Subtotal de referencia</span>
            <strong>{money(pricing.subtotal)}</strong>
          </div>

          <div className="summary-line total">
            <span>Total estimado</span>
            <strong>{money(pricing.total)}</strong>
          </div>
          <div className="summary-line">
            <span>Volumen estimado</span>
            <strong>{tonnesLabel(orderVolume(pricing.lines).tonnes)}</strong>
          </div>
          <div className="summary-items">
            <span className="summary-label">Método de pago</span>
            <p className="subtle">{paymentLabels[method]}</p>
          </div>
          <Notice>{referenceNotice}</Notice>
        </aside>
      </div>
    </>
  );
}
