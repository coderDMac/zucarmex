'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowRight, FiPause, FiPlay, FiRepeat, FiSkipForward } from 'react-icons/fi';
import { Frequency, PortalData, frequencyLabels } from '@/lib/domain/types';
import { dateLabel, nextDate, today } from '@/lib/domain/dates';
import { api } from '@/lib/api';
import { Empty, ErrorMessage, Modal, Notice, Reveal, useTask } from './ui';
import { PageHeading } from './shell';
export function ScheduleModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const router = useRouter();
  const task = useTask();
  const [frequency, setFrequency] = useState<Frequency>('biweekly');
  const [date, setDate] = useState(nextDate(today(), 'biweekly'));
  return (
    <Modal title="Programa tu pedido habitual" onClose={onClose}>
      <p className="modal-description">
        Anticipa tu abastecimiento. Cuando corresponda, revisarás los precios vigentes y confirmarás
        una nueva solicitud.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          task.run(async () => {
            await api(`orders/${orderId}/schedule`, { frequency, next_due_date: date });
            onClose();
            router.push('/portal/recurrentes');
            router.refresh();
          });
        }}
      >
        <label className="field">
          ¿Con qué frecuencia lo necesitas?
          <select
            value={frequency}
            onChange={(e) => {
              const f = e.target.value as Frequency;
              setFrequency(f);
              setDate(nextDate(today(), f));
            }}
          >
            {Object.entries(frequencyLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Próxima fecha programada
          <input
            type="date"
            min={today()}
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <small>Es la fecha en que revisarás y confirmarás tu intención de compra.</small>
        </label>
        <Notice>Esta programación no crea compras automáticas ni congela precios.</Notice>
        <ErrorMessage message={task.error} />
        <button className="button primary full" disabled={task.pending}>
          {task.pending ? 'Guardando…' : 'Guardar programación'}
          <FiRepeat />
        </button>
      </form>
    </Modal>
  );
}
export function Recurring({ data }: { data: PortalData }) {
  const router = useRouter();
  const task = useTask();
  const [skip, setSkip] = useState<string | null>(null);
  const schedules = [...data.schedules].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.next_due_date.localeCompare(b.next_due_date),
  );
  async function manage(id: string, action: string) {
    await api(`schedules/${id}`, { action });
    setSkip(null);
    router.refresh();
  }
  return (
    <>
      <PageHeading
        eyebrow="PLANEACIÓN SIN COMPLICACIONES"
        title="Pedidos recurrentes"
        description="Tu pedido habitual, a tiempo y siempre bajo tu control."
      />
      <Notice>
        Cuando llegue la fecha verás: “Tienes un pedido programado pendiente de confirmación.”
        Revisarás productos, cantidades, precios y modalidad antes de generar una nueva solicitud.
      </Notice>
      <ErrorMessage message={task.error} />
      {schedules.length ? (
        <div className="schedule-grid content-spacer">
          {schedules.map((s, i) => {
            const due = s.active && s.next_due_date <= today();
            return (
              <Reveal
                key={s.id}
                className={`card schedule-card ${s.active ? '' : 'paused'}`}
                delay={i * 0.05}
              >
                <div className="schedule-header">
                  <div className="schedule-icon">
                    <FiRepeat />
                  </div>
                  <h3>{frequencyLabels[s.frequency]}</h3>
                  <span
                    className={`badge ${due ? 'status-validating' : s.active ? 'status-confirmed' : ''}`}
                  >
                    <span className="status-dot" />
                    {due ? 'Pendiente de confirmación' : s.active ? 'Programado' : 'En pausa'}
                  </span>
                </div>
                {s.items.map((item) => (
                  <div className="schedule-product" key={item.product_id}>
                    <strong>
                      {data.products.find((p) => p.id === item.product_id)?.name ??
                        'Producto no disponible'}
                    </strong>
                    <span>{item.quantity} unidades</span>
                  </div>
                ))}
                <div className="schedule-date">
                  <span>Próximo pedido programado</span>
                  <strong>
                    {dateLabel(s.next_due_date, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                </div>
                <p className="subtle">
                  {s.fulfillment_type === 'delivery'
                    ? 'Entrega en dirección registrada'
                    : 'Recoger en Punto de Venta Culiacán'}
                </p>
                <div className="button-row">
                  {due ? (
                    <Link
                      className="button primary small"
                      href={`/portal/nuevo-pedido?schedule=${s.id}`}
                    >
                      Revisar y confirmar <FiArrowRight />
                    </Link>
                  ) : (
                    <span className="subtle">
                      {s.active
                        ? 'Te avisaremos aquí cuando corresponda.'
                        : 'Puedes reactivar esta programación.'}
                    </span>
                  )}
                  <button
                    className="icon-button"
                    disabled={task.pending}
                    aria-label={s.active ? 'Pausar programación' : 'Reactivar programación'}
                    title={s.active ? 'Pausar' : 'Reactivar'}
                    onClick={() => task.run(() => manage(s.id, 'toggle'))}
                  >
                    {s.active ? <FiPause /> : <FiPlay />}
                  </button>
                </div>
                {due && (
                  <button className="button ghost small" onClick={() => setSkip(s.id)}>
                    <FiSkipForward />
                    Omitir esta recurrencia
                  </button>
                )}
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="card content-spacer">
          <Empty title="Tu siguiente compra puede estar planeada">
            Abre uno de tus pedidos y selecciona “Programar pedido recurrente”.
            <br />
            <Link href="/portal/pedidos" className="button primary content-spacer">
              Ver mis pedidos <FiArrowRight />
            </Link>
          </Empty>
        </div>
      )}
      {skip && (
        <Modal title="¿Omitir esta recurrencia?" onClose={() => setSkip(null)}>
          <p className="modal-description">
            No se generará ninguna solicitud. Avanzaremos la programación a la siguiente fecha
            futura según su frecuencia.
          </p>
          <ErrorMessage message={task.error} />
          <div className="button-row">
            <button className="button light" onClick={() => setSkip(null)}>
              Volver
            </button>
            <button
              className="button primary"
              disabled={task.pending}
              onClick={() => task.run(() => manage(skip, 'skip'))}
            >
              {task.pending ? 'Actualizando…' : 'Omitir y avanzar fecha'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
