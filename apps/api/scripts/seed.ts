/**
 * Test data for one shop: 5 products, 3 customers, 16 orders planned today
 * (varied status, payment, delivery, slot and place), plus 1 overdue and 2 upcoming orders,
 * 2 expenses. Open deliveries are shared between the shop's drivers, if it has any.
 *
 *   yarn seed                 (the only shop in the database)
 *   yarn seed --shop "Glow UP"
 *
 * Goes through the real services, so stock movements and order numbers stay consistent.
 */
import { businessToday } from '../src/config/time.js';
import { pool, withTransaction } from '../src/db/pool.js';
import { insertCustomer } from '../src/modules/customer/customer.repository.js';
import { insertExpense } from '../src/modules/expense/expense.repository.js';
import type { OrderStatus } from '../src/modules/order/order-status.js';
import type { OrderSource } from '../src/modules/order/order-source.js';
import {
  changeOrderStatus,
  createOrder,
  type DeliveryInput,
} from '../src/modules/order/order.service.js';
import { insertProduct } from '../src/modules/product/product.repository.js';
import { applyStockMovement } from '../src/modules/stock/stock.service.js';
import { resolveShop } from './shop-arg.js';

function day(offset: number): string {
  const date = new Date(`${businessToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Workflow order: each status is reached through the previous ones. */
const PATH: OrderStatus[] = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE'];

const PRODUCTS = [
  // name, category, purchase, selling, initial stock, low-stock threshold
  ['Huile de coco 250 ml', 'Beauté et cosmétiques', 9000, 15000, 3, 5],
  ['Savon artisanal', 'Hygiène', 1500, 3500, 40, 10],
  ['Robe wax', 'Vêtements', 25000, 45000, 12, 3],
  ['Sac en raphia', 'Sacs et accessoires', 18000, 32000, 6, 2],
  ['Bracelet perles', 'Bijoux', 2000, 6000, 25, 5],
] as const;

const CUSTOMERS = [
  {
    name: 'Rasoa Hanta',
    phones: ['0341234567', '0321234567'],
    socialProfile: 'fb.com/rasoa.hanta',
  },
  { name: 'Hery Rakoto', phones: ['0331122233'], socialProfile: null },
  { name: 'Voahangy', phones: ['0389876543'], socialProfile: '@voahangy_shop' },
];

type Seed = {
  customer: number | null;
  items: [product: number, quantity: number][];
  status: OrderStatus | 'ANNULEE';
  isPaid: boolean;
  paymentMethod: string | null;
  source: OrderSource | null;
  delivery: DeliveryInput | null;
  scheduledDate?: string;
};

const delivery = (place: string, fee: number, note: string | null = null): DeliveryInput => ({
  place,
  address: null,
  note,
  fee,
});

const ORDERS: Seed[] = [
  // Planned today (10)
  {
    customer: 0,
    items: [
      [0, 1],
      [1, 2],
    ],
    status: 'EN_ATTENTE',
    isPaid: false,
    paymentMethod: null,
    source: 'FACEBOOK',
    delivery: delivery('Analakely', 3000),
  },
  {
    customer: 1,
    items: [[2, 1]],
    status: 'CONFIRMEE',
    isPaid: true,
    paymentMethod: 'MVola',
    source: 'MESSENGER',
    delivery: delivery('Ivandry', 4000, 'Appeler avant'),
  },
  {
    customer: 2,
    items: [[4, 3]],
    status: 'EN_PREPARATION',
    isPaid: false,
    paymentMethod: 'Orange Money',
    source: 'INSTAGRAM',
    delivery: null,
  },
  {
    customer: null,
    items: [[1, 5]],
    status: 'LIVREE',
    isPaid: true,
    paymentMethod: 'Espèces',
    source: 'BOUTIQUE',
    delivery: null,
  },
  {
    customer: 0,
    items: [
      [3, 1],
      [4, 2],
    ],
    status: 'EN_LIVRAISON',
    isPaid: false,
    paymentMethod: 'Espèces',
    source: 'WHATSAPP',
    delivery: delivery('Ambohijatovo', 3000),
  },
  {
    customer: null,
    items: [[2, 2]],
    status: 'EN_ATTENTE',
    isPaid: false,
    paymentMethod: null,
    source: 'TIKTOK',
    delivery: delivery('Behoririka', 5000),
  },
  {
    customer: 1,
    items: [
      [1, 1],
      [4, 1],
    ],
    status: 'LIVREE',
    isPaid: true,
    paymentMethod: 'Airtel Money',
    source: 'APPEL',
    delivery: delivery('Ankorondrano', 3000),
  },
  {
    customer: 2,
    items: [[0, 1]],
    status: 'CONFIRMEE',
    isPaid: false,
    paymentMethod: 'MVola',
    source: 'FACEBOOK',
    delivery: null,
  },
  {
    customer: null,
    items: [[3, 1]],
    status: 'ANNULEE',
    isPaid: false,
    paymentMethod: null,
    source: 'MESSENGER',
    delivery: null,
  },
  {
    customer: 0,
    items: [[1, 3]],
    status: 'EN_LIVRAISON',
    isPaid: true,
    paymentMethod: 'Orange Money',
    source: 'FACEBOOK',
    delivery: delivery('67 ha', 2000),
  },
  // Today's round: same places at several moments (grouping by moment and place)
  ...(
    [
      ['Analakely', 0],
      ['analakély', 1],
      ['Ivandry', 2],
      ['Ivandry', 3],
      ['Ankorondrano', 4],
      ['Analakely', 3],
    ] as const
  ).map(([place, customer]): Seed => ({
    customer: customer % CUSTOMERS.length,
    items: [[1, 1]],
    status: 'CONFIRMEE',
    isPaid: false,
    paymentMethod: 'MVola',
    source: 'FACEBOOK',
    delivery: delivery(place, 3000),
  })),
  // Overdue (planned yesterday, still open) and upcoming
  {
    customer: 1,
    items: [[4, 2]],
    status: 'EN_LIVRAISON',
    isPaid: false,
    paymentMethod: 'Espèces',
    source: 'WHATSAPP',
    delivery: delivery('Isotry', 3000),
    scheduledDate: day(-1),
  },
  {
    customer: 2,
    items: [[2, 1]],
    status: 'CONFIRMEE',
    isPaid: false,
    paymentMethod: null,
    source: 'INSTAGRAM',
    delivery: delivery('Itaosy', 4000),
    scheduledDate: day(1),
  },
  {
    customer: null,
    items: [[1, 2]],
    status: 'EN_ATTENTE',
    isPaid: false,
    paymentMethod: null,
    source: 'FACEBOOK',
    delivery: null,
    scheduledDate: day(3),
  },
];

const shop = await resolveShop();
const { rows: categories } = await pool.query<{ id: string; name: string }>(
  'SELECT id, name FROM product_categories WHERE shop_id = $1',
  [shop.id],
);

const productIds: string[] = [];
for (const [name, category, purchasePrice, sellingPrice, stock, threshold] of PRODUCTS) {
  productIds.push(
    await withTransaction(async (client) => {
      const id = await insertProduct(client, shop.id, {
        name,
        description: null,
        image: null,
        categoryId: categories.find((c) => c.name === category)?.id ?? null,
        purchasePrice,
        sellingPrice,
        lowStockThreshold: threshold,
      });
      await applyStockMovement(client, {
        shopId: shop.id,
        productId: id,
        type: 'AJOUT',
        quantity: stock,
        reason: 'Stock initial',
      });
      return id;
    }),
  );
}

const customerIds: string[] = [];
for (const customer of CUSTOMERS) customerIds.push((await insertCustomer(shop.id, customer)).id);

/** Varied slots, as customers ask: morning, "before 11", "after 17", none. */
const SLOTS = [
  { from: '08:00', to: '12:00' },
  null,
  { from: null, to: '11:00' },
  { from: '14:00', to: '16:00' },
  { from: '17:00', to: null },
];

// Open deliveries go to the shop's drivers in turn; one in three stays "à prendre".
const { rows: drivers } = await pool.query<{ userId: string }>(
  `SELECT user_id AS "userId" FROM shop_members WHERE shop_id = $1 AND role = 'DRIVER'
   ORDER BY created_at`,
  [shop.id],
);
let assigned = 0;

for (const [index, seed] of ORDERS.entries()) {
  const order = await createOrder(shop.id, {
    timeSlot: SLOTS[index % SLOTS.length]!,
    customerId: seed.customer === null ? null : customerIds[seed.customer]!,
    customer: null,
    items: seed.items.map(([p, quantity]) => ({ productId: productIds[p]!, quantity })),
    source: seed.source,
    scheduledDate: seed.scheduledDate ?? null,
    delivery: seed.delivery,
    paymentMethod: seed.paymentMethod,
    isPaid: seed.isPaid,
    status: 'EN_ATTENTE',
  });
  const steps =
    seed.status === 'ANNULEE' ? ['ANNULEE' as const] : PATH.slice(1, PATH.indexOf(seed.status) + 1);
  for (const status of steps) await changeOrderStatus(shop.id, order.id, status);

  const open = !['LIVREE', 'ANNULEE'].includes(seed.status);
  if (seed.delivery && open && drivers.length > 0 && index % 3 !== 0) {
    await pool.query(
      `UPDATE orders SET assigned_to = $3, assigned_at = now(), delivery_notified_at = now()
       WHERE id = $1 AND shop_id = $2`,
      [order.id, shop.id, drivers[assigned++ % drivers.length]!.userId],
    );
  }
}

await insertExpense(shop.id, {
  category: 'PUBLICITE',
  amount: 20000,
  description: 'Boost Facebook',
  date: businessToday(),
});
await insertExpense(shop.id, {
  category: 'EMBALLAGE',
  amount: 8000,
  description: 'Sachets kraft',
  date: businessToday(),
});

console.log(
  `« ${shop.name} » : ${PRODUCTS.length} produits, ${CUSTOMERS.length} clients, ${ORDERS.length} commandes (16 aujourd'hui, 1 en retard, 2 à venir), ${assigned} livraisons données à ${drivers.length} livreur(s), 2 dépenses.`,
);
await pool.end();
