'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiEdit2,
  FiFileText,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { PortalData, Product } from '@/lib/domain/types';
import { money } from '@/lib/domain/pricing';
import { api } from '@/lib/api';
import { PageHeading } from './shell';
import { Empty, ErrorMessage, Modal, Notice, Reveal, useTask } from './ui';
import { OrderTable } from './order-table';
import { HistorySummary } from './history-summary';
import { purchaseHistory, volumeLabel } from '@/lib/domain/history';
import { dateLabel } from '@/lib/domain/dates';
export function AdminDashboard({ data }: { data: PortalData }) {
  const kpis = [
    {
      title: 'Solicitudes pendientes',
      value: data.orders.filter((o) => ['requested', 'validating'].includes(o.status)).length,
      icon: FiFileText,
      detail: 'Requieren validación comercial',
    },
    {
      title: 'Pedidos confirmados',
      value: data.orders.filter((o) => o.status === 'confirmed').length,
      icon: FiCheck,
      detail: 'Disponibilidad y precio validados',
    },
    {
      title: 'En preparación',
      value: data.orders.filter((o) => o.status === 'preparing').length,
      icon: FiPackage,
      detail: 'Tu equipo está trabajando en ellos',
    },
    {
      title: 'Clientes activos',
      value: data.clients.filter((c) => c.active).length,
      icon: FiUsers,
      detail: 'Negocios vinculados al portal',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="PUNTO DE VENTA CULIACÁN"
        title="Todo listo para acompañar a tus clientes"
        description="Una vista sencilla para atender las solicitudes de tu Punto de Venta."
      />
      <HistorySummary orders={data.orders} admin />
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <Reveal key={k.title} className="card kpi" delay={i * 0.04}>
            <div className="kpi-label">
              {k.title}
              <k.icon />
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-foot">{k.detail}</div>
          </Reveal>
        ))}
      </div>
      <Notice>
        Configuración demostrativa. Los productos, precios y clientes son ficticios. En una
        implementación empresarial, SAP seguiría siendo la fuente de verdad operativa.
      </Notice>
      <div className="section-heading">
        <h2>Solicitudes recientes</h2>
        <Link href="/admin/pedidos" className="text-link">
          Ver todos los pedidos <FiArrowRight />
        </Link>
      </div>
      <OrderTable
        admin
        orders={data.orders.slice(0, 6)}
        products={data.products}
        clients={data.clients}
        payments={data.payments}
      />
    </>
  );
}
function ProductModal({ product, onClose }: { product: Partial<Product>; onClose: () => void }) {
  const router = useRouter();
  const task = useTask();
  return (
    <Modal title={product.id ? 'Editar producto demo' : 'Nuevo producto demo'} onClose={onClose}>
      <p className="modal-description">
        El precio de referencia actualizado se mostrará al cliente al refrescar. Las solicitudes
        previas conservan su estimación original.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          task.run(async () => {
            await api(`products/${product.id ?? 'new'}`, {
              sku: f.get('sku'),
              name: f.get('name'),
              presentation: f.get('presentation'),
              description: f.get('description'),
              image_url: f.get('image_url'),
              reference_price: Number(f.get('reference_price')),
              unit_weight_kg: Number(f.get('unit_weight_kg')),
              active: f.get('active') === 'on',
            });
            onClose();
            router.refresh();
          });
        }}
      >
        <div className="field-grid">
          <label className="field">
            SKU
            <input name="sku" defaultValue={product.sku} required maxLength={50} />
          </label>
          <label className="field">
            Precio de referencia (MXN)
            <input
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              name="reference_price"
              defaultValue={product.reference_price}
              required
            />
          </label>
        </div>
        <label className="field content-spacer">
          Nombre
          <input name="name" defaultValue={product.name} required maxLength={150} />
        </label>
        <label className="field">
          Presentación
          <input
            name="presentation"
            defaultValue={product.presentation}
            placeholder="Saco de 50 kg"
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          Peso por unidad (kg)
          <input
            name="unit_weight_kg"
            type="number"
            min="0.001"
            max="100000"
            step="0.001"
            required
            defaultValue={product.unit_weight_kg ?? ''}
          />
          <small>Se guarda en cada nuevo pedido para calcular las toneladas del histórico.</small>
        </label>
        <label className="field">
          Descripción
          <textarea name="description" defaultValue={product.description} maxLength={1000} />
        </label>
        <label className="field">
          Imagen (URL HTTPS o ruta local)
          <input
            name="image_url"
            defaultValue={product.image_url ?? '/images/sugar-standard.svg'}
            maxLength={1000}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="active" defaultChecked={product.active ?? true} />
          Producto activo y visible para clientes
        </label>
        <ErrorMessage message={task.error} />
        <button className="button primary full" disabled={task.pending}>
          {task.pending ? 'Guardando…' : 'Guardar producto'}
          <FiCheck />
        </button>
      </form>
    </Modal>
  );
}
export function AdminProducts({ data }: { data: PortalData }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const router = useRouter();
  const task = useTask();
  const products = data.products.filter((p) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="CATÁLOGO DEMOSTRATIVO"
        title="Productos y precios"
        description="Mantén los productos y sus precios de referencia actualizados."
        action={
          <button className="button primary" onClick={() => setEditing({})}>
            <FiPlus />
            Nuevo producto
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <FiSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            aria-label="Buscar productos"
          />
        </div>
        <span className="count-label">
          {data.products.filter((p) => p.active).length} productos activos
        </span>
      </div>
      <ErrorMessage message={task.error} />
      <div className="card table-card admin-products">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Precio de referencia</th>
                <th>Visibilidad</th>
                <th>Editar</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      <img src={p.image_url || '/images/sugar-standard.svg'} alt="" />
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.presentation}</small>
                      </div>
                    </div>
                  </td>
                  <td>{p.sku}</td>
                  <td className="table-total">
                    {money(p.reference_price)} <small className="subtle">MXN</small>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${p.active ? '' : 'off'}`}
                      disabled={task.pending}
                      aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`}
                      onClick={() =>
                        task.run(async () => {
                          await api(`products/${p.id}`, { ...p, active: !p.active });
                          router.refresh();
                        })
                      }
                    >
                      {p.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${p.name}`}
                      onClick={() => setEditing(p)}
                    >
                      <FiEdit2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && (
            <Empty title="Sin resultados">Busca otro nombre o crea un producto demo.</Empty>
          )}
        </div>
      </div>
      <div className="content-spacer">
        <Notice>
          Productos demo. En el futuro, nombres, presentaciones, imágenes y precios se sustituirán
          por datos oficiales de ZUCARMEX. En una integración empresarial, estos datos provendrían
          de SAP.
        </Notice>
      </div>
      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
export function AdminClients({ data }: { data: PortalData }) {
  const [query, setQuery] = useState('');
  const clients = data.clients.filter((c) =>
    c.business_name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="NEGOCIOS QUE ACOMPAÑAMOS"
        title="Clientes"
        description="Consulta sus compras entregadas, montos vendidos, toneladas y última compra."
      />
      <div className="toolbar">
        <div className="search-field">
          <FiSearch />
          <input
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre de negocio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="count-label">{data.clients.length} negocio(s) registrados</span>
      </div>
      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Contacto</th>
                <th>Ubicación</th>
                <th>Compras / pedidos</th>
                <th>Monto vendido</th>
                <th>Toneladas vendidas</th>
                <th>Última compra</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const clientOrders = data.orders.filter((o) => o.client_id === c.id);
                const history = purchaseHistory(clientOrders);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="client-business">
                        <span className="avatar">
                          {c.business_name
                            .split(' ')
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')}
                        </span>
                        <div>
                          <Link className="text-link" href={`/admin/pedidos?client=${c.id}`}>
                            {c.business_name} <FiArrowRight />
                          </Link>
                          <small>{c.tax_name || 'Negocio demo'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{c.phone}</td>
                    <td>
                      {c.city}, {c.state}
                    </td>
                    <td>
                      {history.count} compras
                      <div className="subtle table-subline">
                        {clientOrders.length} pedidos registrados
                      </div>
                    </td>
                    <td className="table-total">{money(history.amount)}</td>
                    <td>
                      {volumeLabel(history)}
                      {history.unweighedUnits > 0 && <div className="subtle">Volumen parcial</div>}
                    </td>
                    <td>
                      {history.latest ? dateLabel(history.latest.created_at) : 'Sin compras'}
                      {history.latest && (
                        <div className="subtle table-subline">{history.latest.order_number}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.active ? 'status-confirmed' : ''}`}>
                        <span className="status-dot" />
                        {c.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!clients.length && (
            <Empty title="Sin clientes para mostrar">
              Los negocios vinculados aparecerán aquí.
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}
