'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowUpRight,
  FiCheck,
  FiFileText,
  FiHelpCircle,
  FiMessageCircle,
  FiPhone,
} from 'react-icons/fi';
import { PortalData } from '@/lib/domain/types';
import { api } from '@/lib/api';
import { PageHeading } from './shell';
import { ErrorMessage, Modal, Notice, useTask } from './ui';
export function Help() {
  const [topic, setTopic] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="PERSONAS QUE ACOMPAÑAN A TU NEGOCIO"
        title="¿Necesitas ayuda?"
        description="Estamos cerca de ti, también fuera del portal."
      />
      <div className="help-intro">
        <span className="advisor-icon">
          <FiHelpCircle />
        </span>
        <div>
          <h2>La tecnología acerca. Tu asesor acompaña.</h2>
          <p>
            El Portal complementa la atención personalizada de ZUCARMEX. Para resolver una duda o
            revisar una necesidad especial, cuenta con tu asesor del Punto de Venta Culiacán.
          </p>
        </div>
      </div>
      <div className="help-grid">
        {[
          {
            title: 'Contactar asesor',
            text: 'Recibe orientación para planear tu abastecimiento o preparar tu próxima solicitud.',
            icon: FiPhone,
          },
          {
            title: 'Solicitar aclaración sobre pedido',
            text: 'Comparte tu número de pedido y cuéntanos qué necesitas revisar.',
            icon: FiMessageCircle,
          },
          {
            title: 'Consultar condiciones comerciales',
            text: 'Aclara disponibilidad, precio final y condiciones de tu compra con tu asesor.',
            icon: FiFileText,
          },
        ].map((t) => (
          <div className="card help-card" key={t.title}>
            <t.icon />
            <h3>{t.title}</h3>
            <p>{t.text}</p>
            <button
              className="button light small"
              onClick={() => {
                setTopic(t.title);
                setSent(false);
              }}
            >
              Solicitar atención <FiArrowUpRight />
            </button>
          </div>
        ))}
      </div>
      <div className="content-spacer">
        <Notice>
          Opciones demostrativas. Este prototipo no envía mensajes ni ofrece chat en tiempo real.
        </Notice>
      </div>
      {topic && (
        <Modal title={topic} onClose={() => setTopic('')}>
          {sent ? (
            <>
              <Notice tone="success">Solicitud preparada para fines demostrativos.</Notice>
              <p className="modal-description">
                En una versión empresarial, tu asesor recibiría esta solicitud. En este prototipo no
                se envía ningún mensaje.
              </p>
              <button className="button primary full" onClick={() => setTopic('')}>
                Entendido
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <p className="modal-description">
                Comparte los detalles para preparar una solicitud de atención.
              </p>
              <label className="field">
                Número de pedido (opcional)
                <input placeholder="ZUC-00128" maxLength={30} />
              </label>
              <label className="field">
                ¿En qué podemos ayudarte?
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  placeholder="Cuéntanos qué necesitas revisar…"
                />
              </label>
              <Notice>Formulario demostrativo. La información no se envía ni se almacena.</Notice>
              <button className="button primary full">
                Preparar solicitud <FiCheck />
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
export function ProfilePage({ data }: { data: PortalData }) {
  const router = useRouter();
  const task = useTask();
  const [saved, setSaved] = useState(false);
  const c = data.client;
  return (
    <>
      <PageHeading
        eyebrow="LA INFORMACIÓN DE TU NEGOCIO"
        title="Mi perfil"
        description="Mantén tus datos de contacto a la mano."
      />
      <div className="profile-layout">
        <div className="card card-pad">
          <div className="profile-banner">
            <span className="avatar">MG</span>
            <div>
              <h3>{data.profile.full_name}</h3>
              <p>Responsable de abastecimiento</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              task.run(async () => {
                await api('profile', { full_name: f.get('full_name'), phone: f.get('phone') });
                setSaved(true);
                router.refresh();
              });
            }}
          >
            <label className="field">
              Nombre de contacto
              <input
                name="full_name"
                defaultValue={data.profile.full_name}
                required
                maxLength={100}
              />
            </label>
            <label className="field">
              Teléfono
              <input type="tel" name="phone" defaultValue={data.profile.phone} maxLength={30} />
            </label>
            <ErrorMessage message={task.error} />
            {saved && <div className="inline-message">Datos de contacto actualizados.</div>}
            <button className="button primary content-spacer" disabled={task.pending}>
              {task.pending ? 'Guardando…' : 'Guardar cambios'}
              <FiCheck />
            </button>
          </form>
        </div>
        <div className="card card-pad">
          <h2>Tu negocio</h2>
          {c ? (
            <>
              <div className="info-row">
                <small>Nombre del negocio</small>
                {c.business_name}
              </div>
              <div className="info-row">
                <small>Razón social</small>
                {c.tax_name || 'Sin registrar'}
              </div>
              <div className="info-row">
                <small>Dirección registrada</small>
                {c.address}
                <br />
                {c.city}, {c.state} · C.P. {c.postal_code}
              </div>
              <div className="info-row">
                <small>Punto de Venta</small>Culiacán, Sinaloa
              </div>
              <div className="content-spacer">
                <Notice>Para actualizar la información de tu negocio, contacta a tu asesor.</Notice>
              </div>
            </>
          ) : (
            <Notice tone="warning">Tu negocio aún no está vinculado. Contacta a tu asesor.</Notice>
          )}
        </div>
      </div>
    </>
  );
}
