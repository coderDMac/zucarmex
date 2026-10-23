'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { PortalData } from '@/lib/domain/types';
import { PageHeading } from './shell';
import { OrderTable } from './order-table';
export function OrderList({ data, admin = false }: { data: PortalData; admin?: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const orders = data.orders.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'active' && !['delivered', 'cancelled'].includes(o.status)) ||
        (filter === 'delivered' && o.status === 'delivered') ||
        (filter === 'requested' && ['requested', 'validating'].includes(o.status))) &&
      `${o.order_number} ${data.clients.find((c) => c.id === o.client_id)?.business_name ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow={admin ? 'ATENCIÓN COMERCIAL' : 'TODO TU HISTORIAL'}
        title={admin ? 'Pedidos y solicitudes' : 'Mis pedidos'}
        description={
          admin
            ? 'Valida solicitudes, confirma condiciones y acompaña a tus clientes.'
            : 'Consulta tus solicitudes, sigue cada pedido y vuelve a pedir en segundos.'
        }
        action={
          !admin ? (
            <Link href="/portal/nuevo-pedido" className="button primary">
              <FiPlus />
              Nuevo pedido
            </Link>
          ) : undefined
        }
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {[
            ['all', 'Todos'],
            [admin ? 'requested' : 'active', admin ? 'Por validar' : 'En marcha'],
            ['delivered', 'Entregados'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-field">
          <FiSearch />
          <input
            aria-label="Buscar pedidos"
            placeholder={admin ? 'Buscar pedido o cliente…' : 'Buscar por número de pedido…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <OrderTable orders={orders} products={data.products} clients={data.clients} admin={admin} />
    </>
  );
}
