'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { PortalData } from '@/lib/domain/types';
import { PageHeading } from './shell';
import { OrderTable } from './order-table';
import { HistorySummary } from './history-summary';
import { Notice } from './ui';
import { businessDate } from '@/lib/domain/dates';
export function OrderList({
  data,
  admin = false,
  initialClientId = '',
}: {
  data: PortalData;
  admin?: boolean;
  initialClientId?: string;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [clientId, setClientId] = useState(initialClientId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalid = Boolean(from && to && from > to);
  const periodOrders = data.orders.filter((order) => {
    const day = businessDate(order.created_at);
    return (
      !invalid &&
      (!clientId || order.client_id === clientId) &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      `${order.order_number} ${data.clients.find((c) => c.id === order.client_id)?.business_name ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const orders = periodOrders.filter(
    (order) =>
      filter === 'all' ||
      (filter === 'active' && !['delivered', 'cancelled'].includes(order.status)) ||
      (filter === 'delivered' && order.status === 'delivered') ||
      (filter === 'requested' && ['requested', 'validating'].includes(order.status)),
  );
  return (
    <>
      <PageHeading
        eyebrow={admin ? 'PEDIDOS, MONTOS Y TONELADAS' : 'TUS COMPRAS A LA VISTA'}
        title={admin ? 'Histórico de pedidos y ventas' : 'Histórico de pedidos'}
        description={
          admin
            ? 'Consulta lo vendido, el volumen entregado y la última compra de cada cliente.'
            : 'Revisa tus montos, toneladas y última compra. Repite un pedido cuando lo necesites.'
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
      <div className="history-filters card">
        <div className="search-field">
          <FiSearch />
          <input
            aria-label="Buscar pedidos"
            placeholder={admin ? 'Buscar pedido o cliente…' : 'Buscar por número de pedido…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {admin && (
          <label className="field">
            Cliente
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Todos los clientes</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Desde
          <input
            type="date"
            value={from}
            onInput={(e) => setFrom(e.currentTarget.value)}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          Hasta
          <input
            type="date"
            value={to}
            min={from || undefined}
            onInput={(e) => setTo(e.currentTarget.value)}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {(from || to || query || clientId) && (
          <button
            className="button light small"
            onClick={() => {
              setFrom('');
              setTo('');
              setQuery('');
              setClientId('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {invalid && (
        <div className="content-spacer">
          <Notice tone="warning">
            La fecha de inicio debe ser anterior o igual a la fecha final.
          </Notice>
        </div>
      )}
      <HistorySummary orders={periodOrders} admin={admin} />
      <p className="history-note">
        Los montos y toneladas del resumen corresponden únicamente a pedidos entregados con importe
        confirmado. La última compra usa la fecha registrada del pedido.
      </p>
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
        <span className="count-label">{orders.length} pedidos en la vista</span>
      </div>
      <OrderTable
        orders={orders}
        products={data.products}
        clients={data.clients}
        payments={data.payments}
        admin={admin}
      />
    </>
  );
}
