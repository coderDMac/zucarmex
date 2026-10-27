'use client';
import { FiClock, FiDollarSign, FiFileText, FiPackage } from 'react-icons/fi';
import { Order } from '@/lib/domain/types';
import { purchaseHistory, volumeLabel } from '@/lib/domain/history';
import { money } from '@/lib/domain/pricing';
import { dateLabel } from '@/lib/domain/dates';
import { Reveal } from './ui';
export function HistorySummary({ orders, admin = false }: { orders: Order[]; admin?: boolean }) {
  const history = purchaseHistory(orders);
  const cards = [
    {
      label: 'Pedidos entregados',
      value: String(history.count),
      detail: 'Compras realizadas',
      icon: FiFileText,
    },
    {
      label: admin ? 'Monto vendido' : 'Monto comprado',
      value: money(history.amount),
      detail: 'Importes confirmados · MXN',
      icon: FiDollarSign,
    },
    {
      label: admin ? 'Toneladas vendidas' : 'Toneladas compradas',
      value: volumeLabel(history),
      detail: history.unweighedUnits
        ? `${history.unweighedUnits} unidades sin peso · volumen parcial`
        : `${history.units} unidades entregadas`,
      icon: FiPackage,
    },
    {
      label: 'Última compra',
      value: history.latest
        ? dateLabel(history.latest.created_at, { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Sin compras',
      detail: history.latest?.order_number ?? 'Aún no hay pedidos entregados',
      icon: FiClock,
    },
  ];
  return (
    <div className="history-summary" aria-label="Resumen de compras entregadas">
      {cards.map((card, i) => (
        <Reveal key={card.label} className="card history-metric" delay={i * 0.03}>
          <div className="history-metric-label">
            <span>{card.label}</span>
            <card.icon />
          </div>
          <div className="history-metric-value">{card.value}</div>
          <p>{card.detail}</p>
        </Reveal>
      ))}
    </div>
  );
}
