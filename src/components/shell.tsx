'use client';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FiGrid,
  FiPackage,
  FiFileText,
  FiRepeat,
  FiHelpCircle,
  FiUser,
  FiUsers,
  FiPercent,
  FiBell,
  FiSearch,
  FiChevronDown,
  FiLogOut,
  FiArrowUpRight,
  FiMenu,
  FiX,
  FiMapPin,
  FiArrowRight,
  FiShield,
} from 'react-icons/fi';
import { Brand } from './brand';
import { Profile } from '@/lib/domain/types';
import { dateLabel, today } from '@/lib/domain/dates';
import { api } from '@/lib/api';
export function Shell({
  children,
  profile,
  business,
  demo,
  due,
}: {
  children: ReactNode;
  profile: Profile;
  business: string;
  demo: boolean;
  due: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const admin = profile.role === 'admin';
  const [mobile, setMobile] = useState(false);
  const [bell, setBell] = useState(false);
  const [error, setError] = useState('');
  const nav = admin
    ? [
        { href: '/admin', label: 'Resumen', icon: FiGrid },
        { href: '/admin/pedidos', label: 'Pedidos', icon: FiFileText },
        { href: '/admin/productos', label: 'Productos', icon: FiPackage },
        { href: '/admin/clientes', label: 'Clientes', icon: FiUsers },
        { href: '/admin/beneficios', label: 'Beneficios', icon: FiPercent },
      ]
    : [
        { href: '/portal', label: 'Inicio', icon: FiGrid },
        { href: '/portal/catalogo', label: 'Catálogo de productos', icon: FiPackage },
        { href: '/portal/pedidos', label: 'Mis pedidos', icon: FiFileText },
        { href: '/portal/recurrentes', label: 'Pedidos recurrentes', icon: FiRepeat },
      ];
  const current = pathname.includes('nuevo-pedido')
    ? 'Nuevo pedido'
    : (nav.find(
        (n) => pathname === n.href || (n.href.split('/').length > 2 && pathname.startsWith(n.href)),
      )?.label ?? (pathname.includes('ayuda') ? 'Centro de ayuda' : 'Mi perfil'));
  async function exit() {
    try {
      await api('logout');
      router.push('/login');
      router.refresh();
    } catch {
      setError('No se pudo cerrar la sesión. Intenta de nuevo.');
    }
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Ir al contenido
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <Link
          href={admin ? '/admin' : '/portal'}
          className="brand-link"
          aria-label="ZUCARMEX Inicio"
        >
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        >
          <FiX />
        </button>
        <div className="location">
          <span className="location-icon">
            <FiMapPin />
          </span>
          <div>
            <strong>Punto de Venta</strong>
            <small>Culiacán, Sinaloa</small>
          </div>
          <FiChevronDown />
        </div>
        <p className="nav-caption">{admin ? 'ADMINISTRACIÓN' : 'MI ESPACIO'}</p>
        <nav aria-label="Navegación principal">
          {nav.map((n) => {
            const active =
              pathname === n.href || (n.href.split('/').length > 2 && pathname.startsWith(n.href));
            return (
              <Link
                onClick={() => setMobile(false)}
                key={n.href}
                href={n.href}
                className={`nav-link ${active ? 'active' : ''}`}
              >
                <n.icon />
                <span>{n.label}</span>
                {n.label === 'Pedidos recurrentes' && due > 0 && (
                  <span className="nav-count">{due}</span>
                )}
              </Link>
            );
          })}
        </nav>
        {!admin && (
          <div className="advisor-card">
            <span className="advisor-icon">
              <FiHelpCircle />
            </span>
            <h3>Siempre cerca de ti</h3>
            <p>Tu asesor está para ayudarte con lo que necesites.</p>
            <Link href="/portal/ayuda">
              Contactar a mi asesor <FiArrowUpRight />
            </Link>
          </div>
        )}
        <div className="sidebar-bottom">
          {!admin && (
            <>
              <Link
                className={`nav-link ${pathname === '/portal/ayuda' ? 'active' : ''}`}
                href="/portal/ayuda"
              >
                <FiHelpCircle />
                Centro de ayuda
              </Link>
              <Link
                className={`nav-link ${pathname === '/portal/perfil' ? 'active' : ''}`}
                href="/portal/perfil"
              >
                <FiUser />
                Mi perfil
              </Link>
            </>
          )}
          {demo && (
            <button
              className="demo-switch"
              onClick={async () => {
                try {
                  const result = await api('demo', { role: admin ? 'client' : 'admin' });
                  router.push(result.redirect!);
                  router.refresh();
                } catch {
                  setError('No se pudo cambiar de vista.');
                }
              }}
            >
              <FiShield />
              {admin ? 'Ver como cliente' : 'Vista de administrador'}
              <FiArrowRight />
            </button>
          )}
          <button className="nav-link logout" onClick={exit}>
            <FiLogOut />
            Cerrar sesión
          </button>
          {error && (
            <p role="alert" className="tiny-error">
              {error}
            </p>
          )}
          <div className="user-block">
            <span className={`avatar ${admin ? 'admin-avatar' : ''}`}>{admin ? 'ZA' : 'LE'}</span>
            <div>
              <strong>{admin ? 'Administración' : business}</strong>
              <small>{admin ? 'Equipo ZUCARMEX' : 'Cliente · Culiacán'}</small>
            </div>
            <FiChevronDown />
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menú"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <FiMenu />
            </button>
            <span>{admin ? 'Panel administrativo' : 'Mi portal'}</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <Link
              className="search-shortcut"
              href={admin ? '/admin/productos' : '/portal/catalogo'}
            >
              <FiSearch />
              <span>Buscar productos</span>
            </Link>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Ver notificaciones"
                aria-expanded={bell}
                onClick={() => setBell(!bell)}
              >
                <FiBell />
                {due > 0 && !admin && <i />}
              </button>
              {bell && (
                <div className="notification-popover">
                  <strong>Tu abastecimiento al día</strong>
                  <p>
                    {due > 0 && !admin
                      ? 'Tienes un pedido programado pendiente de confirmación.'
                      : 'No tienes notificaciones pendientes.'}
                  </p>
                  {due > 0 && !admin && (
                    <Link onClick={() => setBell(false)} href="/portal/recurrentes">
                      Revisar programaciones <FiArrowRight />
                    </Link>
                  )}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <span className="avatar avatar-small">{admin ? 'ZA' : 'MG'}</span>
          </div>
        </header>
        {demo && (
          <div className="demo-strip">
            <span className="status-dot" /> Demostración local{' '}
            <span>· Datos ficticios, sin conexión a Supabase</span>
            <span className="demo-strip-right">Proyecto de Innovación II</span>
          </div>
        )}
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} ZUCARMEX · Punto de Venta Culiacán</span>
          <span>
            Prototipo académico <span className="footer-dot">·</span> Productos y precios demo
          </span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-action">
        {action ?? (
          <span className="date-chip">
            {dateLabel(today(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        )}
      </div>
    </div>
  );
}
