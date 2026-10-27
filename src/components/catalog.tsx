'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheck, FiPackage, FiPlus, FiSearch } from 'react-icons/fi';
import { PortalData } from '@/lib/domain/types';
import { dateLabel } from '@/lib/domain/dates';
import { money, priceOrder } from '@/lib/domain/pricing';
import { Empty, Notice, Quantity, Reveal } from './ui';
import { PageHeading } from './shell';
export function Catalog({ data }: { data: PortalData }) {
  const [query, setQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [added, setAdded] = useState('');
  const products = data.products.filter(
    (p) =>
      p.active &&
      `${p.name} ${p.sku} ${p.presentation}`.toLowerCase().includes(query.toLowerCase()),
  );
  const items = Object.entries(basket)
    .filter(([, quantity]) => quantity > 0)
    .map(([product_id, quantity]) => ({ product_id, quantity }));
  const pricing = priceOrder(items, data.products);
  return (
    <>
      <PageHeading
        eyebrow="INSUMOS PARA TU NEGOCIO"
        title="Catálogo de productos"
        description="Consulta el precio de referencia vigente y prepara tu próxima solicitud."
      />
      <div className="toolbar">
        <div className="search-field">
          <FiSearch />
          <input
            aria-label="Buscar en el catálogo"
            placeholder="Buscar producto o SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="count-label">{products.length} productos demo disponibles</span>
      </div>
      <Notice>
        Catálogo demostrativo. Los productos, presentaciones, imágenes y precios se sustituirán por
        información proporcionada por ZUCARMEX. El precio final se confirma al procesar tu
        solicitud.
      </Notice>
      <div className="catalog-grid content-spacer">
        {products.map((p, i) => {
          const qty = quantities[p.id] ?? 1;
          return (
            <Reveal className="card product-card" key={p.id} delay={i * 0.04}>
              <div className="product-image">
                <span className="tiny-badge">PRODUCTO DEMO</span>
                <img
                  src={p.image_url || '/images/sugar-standard.svg'}
                  alt={`Presentación demo: ${p.name}`}
                />
              </div>
              <div className="product-body">
                <div className="sku">{p.sku}</div>
                <h3>{p.name}</h3>
                <div className="subtle" style={{ marginTop: 4 }}>
                  {p.presentation}
                </div>
                <p className="product-description">{p.description}</p>
                <div className="product-price">
                  {money(p.reference_price)} <small>MXN / unidad</small>
                </div>
                <div className="product-updated">
                  Precio de referencia ·{' '}
                  {dateLabel(p.updated_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="product-actions">
                  <Quantity
                    value={qty}
                    onChange={(n) => setQuantities({ ...quantities, [p.id]: n })}
                    label={`Cantidad de ${p.name}`}
                  />
                  <button
                    className="button light small"
                    disabled={qty < 1}
                    onClick={() => {
                      setBasket({ ...basket, [p.id]: Math.min(10000, (basket[p.id] ?? 0) + qty) });
                      setAdded(p.id);
                    }}
                  >
                    {added === p.id ? <FiCheck /> : <FiPlus />}
                    {added === p.id ? 'Agregado' : 'Agregar al pedido'}
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      {!products.length && (
        <Empty title="No encontramos productos">Prueba con otro nombre o SKU.</Empty>
      )}
      {items.length > 0 && (
        <div className="basket-bar" aria-live="polite">
          <FiPackage />
          <div>
            <strong>{items.reduce((s, i) => s + i.quantity, 0)} unidades en tu solicitud</strong>
            <p>Total estimado: {money(pricing.total)} MXN</p>
          </div>
          <Link
            className="button lime"
            href={`/portal/nuevo-pedido?items=${encodeURIComponent(JSON.stringify(items))}`}
          >
            Continuar pedido <FiArrowRight />
          </Link>
        </div>
      )}
    </>
  );
}
