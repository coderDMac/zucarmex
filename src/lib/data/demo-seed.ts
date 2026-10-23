import { Client, Order, PortalData, Product, Profile, Tier } from '@/lib/domain/types';
import { addDays, today } from '@/lib/domain/dates';
import { priceOrder } from '@/lib/domain/pricing';
export const DEMO_CLIENT_ID = '10000000-0000-4000-8000-000000000001';
export const DEMO_PROFILE_ID = '20000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN_ID = '20000000-0000-4000-8000-000000000002';
export const demoProfiles: Profile[] = [
  { id: DEMO_PROFILE_ID, full_name: 'María González', role: 'client', phone: '667 000 0101' },
  { id: DEMO_ADMIN_ID, full_name: 'Equipo ZUCARMEX', role: 'admin', phone: '667 000 0202' },
];
export const demoClient: Client = {
  id: DEMO_CLIENT_ID,
  profile_id: DEMO_PROFILE_ID,
  business_name: 'Panadería La Espiga',
  tax_name: 'Panadería La Espiga · Negocio ficticio',
  phone: '667 000 0101',
  address: 'Av. de los Panaderos 120, Col. Centro',
  city: 'Culiacán',
  state: 'Sinaloa',
  postal_code: '80000',
  active: true,
};
export const demoTiers: Tier[] = [
  { id: 1, min_quantity: 1, max_quantity: 9, discount_percent: 0 },
  { id: 2, min_quantity: 10, max_quantity: 24, discount_percent: 2 },
  { id: 3, min_quantity: 25, max_quantity: 49, discount_percent: 4 },
  { id: 4, min_quantity: 50, max_quantity: null, discount_percent: 6 },
];
export const demoProducts: Product[] = [
  [
    '01',
    'AZ-EST-50',
    'Azúcar estándar',
    'Cristales de azúcar para tus preparaciones de todos los días.',
    'Saco de 50 kg',
    1245,
    'standard',
  ],
  [
    '02',
    'AZ-REF-50',
    'Azúcar refinada',
    'Textura uniforme para panificación y repostería.',
    'Saco de 50 kg',
    1395,
    'refined',
  ],
  [
    '03',
    'AZ-MAS-25',
    'Azúcar mascabado',
    'Sabor y color para recetas con un toque especial.',
    'Saco de 25 kg',
    895,
    'brown',
  ],
  [
    '04',
    'AZ-GLS-20',
    'Azúcar glass',
    'Molienda fina para coberturas, glaseados y decoración.',
    'Saco de 20 kg',
    765,
    'glass',
  ],
].map(([id, sku, name, description, presentation, price, image]) => ({
  id: `30000000-0000-4000-8000-0000000000${id}`,
  sku: String(sku),
  name: String(name),
  description: String(description),
  presentation: String(presentation),
  reference_price: Number(price),
  image_url: `/images/sugar-${image}.svg`,
  active: true,
  updated_at: new Date().toISOString(),
}));
export type DemoStore = Omit<PortalData, 'profile' | 'client' | 'demo'> & { profiles: Profile[] };
export function createDemoStore(): DemoStore {
  const now = today();
  const makeOrder = (
    id: string,
    number: string,
    quantity: number,
    status: Order['status'],
    daysAgo: number,
  ): Order => {
    const pricing = priceOrder(
      [{ product_id: demoProducts[0].id, quantity }],
      demoProducts,
      demoTiers,
    );
    return {
      id,
      order_number: number,
      client_id: DEMO_CLIENT_ID,
      status,
      requested_date: addDays(now, status === 'delivered' ? -daysAgo + 2 : 2),
      fulfillment_type: 'delivery',
      delivery_address: `${demoClient.address}, ${demoClient.city}, ${demoClient.state}, C.P. ${demoClient.postal_code}`,
      reference_subtotal: pricing.subtotal,
      estimated_discount: pricing.discount,
      estimated_total: pricing.total,
      confirmed_total: pricing.total,
      payment_status: status === 'delivered' ? 'simulated_paid' : 'pending',
      incident_note: null,
      created_at: `${addDays(now, -daysAgo)}T16:30:00Z`,
      updated_at: new Date().toISOString(),
      items: pricing.lines.map((line, i) => ({
        ...line,
        id: `${id}-item-${i}`,
        confirmed_unit_price: line.reference_unit_price,
        confirmed_line_total: line.estimated_line_total,
      })),
    };
  };
  const orders = [
    makeOrder('40000000-0000-4000-8000-000000000001', 'ZUC-00128', 20, 'preparing', 1),
    makeOrder('40000000-0000-4000-8000-000000000002', 'ZUC-00124', 20, 'delivered', 15),
    makeOrder('40000000-0000-4000-8000-000000000003', 'ZUC-00119', 25, 'delivered', 30),
  ];
  return {
    profiles: demoProfiles,
    products: demoProducts,
    tiers: demoTiers,
    clients: [demoClient],
    orders,
    schedules: [
      {
        id: '50000000-0000-4000-8000-000000000001',
        client_id: DEMO_CLIENT_ID,
        frequency: 'biweekly',
        next_due_date: now,
        active: true,
        fulfillment_type: 'delivery',
        delivery_address: orders[0].delivery_address,
        created_at: orders[1].created_at,
        updated_at: new Date().toISOString(),
        items: [{ product_id: demoProducts[0].id, quantity: 20 }],
      },
    ],
    payments: orders
      .filter((o) => o.payment_status === 'simulated_paid')
      .map((o) => ({
        id: `payment-${o.id}`,
        order_id: o.id,
        payment_method: 'bank_transfer',
        status: 'simulated_paid',
        amount: o.confirmed_total!,
        created_at: o.created_at,
      })),
  };
}
