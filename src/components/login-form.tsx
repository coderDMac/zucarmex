'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiRepeat,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import { Brand } from './brand';
import { ErrorMessage, Notice, Reveal, useTask } from './ui';
import { api } from '@/lib/api';
export function LoginForm({
  configured,
  demoEnabled,
}: {
  configured: boolean;
  demoEnabled: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const task = useTask();
  const enter = async (path: string, body: unknown) => {
    const result = await api(path, body);
    router.push(result.redirect!);
    router.refresh();
  };
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-content">
          <div className="login-kicker">
            <span className="status-dot" />
            Punto de Venta Culiacán
          </div>
          <h1>
            Tu próximo pedido,
            <br />
            <em>un paso adelante.</em>
          </h1>
          <p>Más tiempo para tu negocio. Menos llamadas para tu abastecimiento.</p>
          <div className="login-mini-card">
            <div className="login-mini-icon">
              <FiRepeat />
            </div>
            <div>
              <strong>Planea. Repite. Sigue creciendo.</strong>
              <small>Tu abastecimiento, en un solo lugar.</small>
            </div>
          </div>
        </div>
        <div className="login-story-footer">
          <FiMapPin />
          Culiacán, Sinaloa <span>·</span> Siempre cerca de tu negocio
        </div>
      </section>
      <section className="login-form-side">
        <Reveal className="login-form">
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <div className="eyebrow">BIENVENIDO A TU PORTAL</div>
          <h2>Un gusto verte de nuevo.</h2>
          <p>Ingresa para gestionar tus pedidos y anticipar las necesidades de tu negocio.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              task.run(() =>
                enter('login', { email: form.get('email'), password: form.get('password') }),
              );
            }}
          >
            <label className="field">
              Correo electrónico
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="tu@negocio.com"
                required
                disabled={task.pending}
              />
            </label>
            <label className="field">
              Contraseña
              <div className="password-wrap">
                <input
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  required
                  disabled={task.pending}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>
            <ErrorMessage message={task.error} />
            <button className="button primary full" disabled={task.pending || !configured}>
              {task.pending ? 'Ingresando…' : 'Iniciar sesión'}
              <FiArrowRight />
            </button>
          </form>
          <p className="login-help">
            ¿Necesitas acceso? <span>Solicítalo a tu asesor ZUCARMEX.</span>
          </p>
          {!configured && !demoEnabled && (
            <Notice tone="warning">
              Configura las variables de Supabase y ejecuta el seed de usuarios indicado en
              README.md.
            </Notice>
          )}
          {demoEnabled && (
            <>
              <div className="login-divider">
                <span>EXPLORA EL PROTOTIPO</span>
              </div>
              <div className="demo-options">
                <button
                  className="button light"
                  disabled={task.pending}
                  onClick={() => task.run(() => enter('demo', { role: 'client' }))}
                >
                  <FiUser />
                  Entrar como cliente
                </button>
                <button
                  className="button light"
                  disabled={task.pending}
                  onClick={() => task.run(() => enter('demo', { role: 'admin' }))}
                >
                  <FiShield />
                  Administración
                </button>
              </div>
              <p className="login-bottom">
                Demostración local con datos ficticios.
                <br />
                El acceso real utiliza Supabase Auth al configurar el proyecto.
              </p>
            </>
          )}
          <p className="login-bottom">
            Portal de Clientes ZUCARMEX
            <br />
            Proyecto de Innovación II · Prototipo académico
          </p>
        </Reveal>
      </section>
    </div>
  );
}
