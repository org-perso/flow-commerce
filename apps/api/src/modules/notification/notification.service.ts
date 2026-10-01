import { pool, withTransaction } from '../../db/pool.js';
import type { Order } from '../order/order.repository.js';
import { OPEN_STATUSES } from '../order/order-status.js';
import { expoPushSender, type PushMessage, type PushSender } from './push.js';

let sender: PushSender = expoPushSender;

/** Injectable so tests record notifications instead of calling Expo. */
export function setPushSender(next: PushSender) {
  sender = next;
}

type Notification = { title: string; body: string; data: Record<string, string> };

/** "45 000 Ar" (integer Ariary, French grouping). */
const ar = (amount: number) => `${amount.toLocaleString('fr-FR').replace(/\s/g, ' ')} Ar`;

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/**
 * Sends to every device of the users. Never throws: a notification must not fail the action
 * that triggered it. Tokens of uninstalled apps are removed.
 */
export async function notifyUsers(userIds: string[], notification: Notification): Promise<void> {
  try {
    if (userIds.length === 0) return;
    const { rows } = await pool.query<{ token: string }>(
      'SELECT token FROM push_tokens WHERE user_id = ANY($1)',
      [userIds],
    );
    if (rows.length === 0) return;
    const messages: PushMessage[] = rows.map((r) => ({ to: r.token, ...notification }));
    const results = await sender(messages);
    const gone = messages.filter((_, i) => results[i]?.unregistered).map((m) => m.to);
    if (gone.length > 0) await pool.query('DELETE FROM push_tokens WHERE token = ANY($1)', [gone]);
  } catch (error) {
    console.error('Push notification failed', error);
  }
}

/** Current members with these roles (RG-59: never someone who left), except `exceptUserId`. */
async function membersWithRoles(
  shopId: string,
  roles: string[],
  exceptUserId?: string,
): Promise<string[]> {
  const { rows } = await pool.query<{ userId: string }>(
    `SELECT user_id AS "userId" FROM shop_members
     WHERE shop_id = $1 AND role = ANY($2) AND user_id IS DISTINCT FROM $3`,
    [shopId, roles, exceptUserId ?? null],
  );
  return rows.map((r) => r.userId);
}

async function shopName(shopId: string): Promise<string> {
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM shops WHERE id = $1', [
    shopId,
  ]);
  return rows[0]?.name ?? '';
}

// "Notifier les livreurs" ----------------------------------------------------

/** Deliveries whose current state (assigned, or to take) has not been announced yet. */
const TO_NOTIFY = `shop_id = $1 AND is_delivery AND status = ANY($2) AND delivery_notified_at IS NULL`;

/** For the button: orders to announce and how many drivers would be notified. */
export async function deliveriesToNotify(
  shopId: string,
): Promise<{ orders: number; drivers: number }> {
  const { rows } = await pool.query<{ orders: number; drivers: number }>(
    `WITH pending AS (SELECT assigned_to FROM orders WHERE ${TO_NOTIFY})
     SELECT (SELECT count(*)::int FROM pending) AS orders,
            (SELECT count(*)::int FROM shop_members m
             WHERE m.shop_id = $1 AND m.role = 'DRIVER'
               AND (m.user_id IN (SELECT assigned_to FROM pending)
                    OR EXISTS (SELECT 1 FROM pending WHERE assigned_to IS NULL))) AS drivers`,
    [shopId, OPEN_STATUSES],
  );
  return rows[0]!;
}

/**
 * One notification per driver with the number of deliveries newly assigned to them, and one
 * to every driver for the deliveries to take. Marks them announced, so a second tap sends
 * nothing again.
 */
export async function notifyDrivers(shopId: string): Promise<{ orders: number; drivers: number }> {
  const pending = await withTransaction(async (client) => {
    const { rows } = await client.query<{ assignedTo: string | null }>(
      `UPDATE orders SET delivery_notified_at = now() WHERE ${TO_NOTIFY}
       RETURNING assigned_to AS "assignedTo"`,
      [shopId, OPEN_STATUSES],
    );
    return rows;
  });
  if (pending.length === 0) return { orders: 0, drivers: 0 };

  const name = await shopName(shopId);
  const body = `${name} · Voir les détails`;
  const perDriver = new Map<string, number>();
  let available = 0;
  for (const { assignedTo } of pending) {
    if (assignedTo) perDriver.set(assignedTo, (perDriver.get(assignedTo) ?? 0) + 1);
    else available++;
  }

  const notified = new Set<string>();
  for (const [driverId, count] of perDriver) {
    notified.add(driverId);
    await notifyUsers([driverId], {
      title: `🛵 ${plural(count, 'Nouvelle livraison pour vous', `${count} nouvelles livraisons pour vous`)}`,
      body,
      data: { type: 'deliveries', tab: 'mine', shopId },
    });
  }
  if (available > 0) {
    const drivers = await membersWithRoles(shopId, ['DRIVER']);
    drivers.forEach((d) => notified.add(d));
    await notifyUsers(drivers, {
      title: `📦 ${available} ${plural(available, 'livraison à prendre', 'livraisons à prendre')}`,
      body,
      data: { type: 'deliveries', tab: 'available', shopId },
    });
  }
  return { orders: pending.length, drivers: notified.size };
}

// Driver actions, sent right away to owners and managers ----------------------

function orderLabel(order: Order): string {
  return (
    [order.customer?.name, order.delivery?.place].filter(Boolean).join(' · ') || 'une commande'
  );
}

export async function notifyDelivered(shopId: string, order: Order) {
  const driverName = order.driver?.name ?? 'Le livreur';
  await notifyUsers(await membersWithRoles(shopId, ['OWNER', 'MANAGER']), {
    title: '✅ Commande livrée',
    body: `${driverName} a livré ${orderLabel(order)}`,
    data: { type: 'order', shopId, orderId: order.id },
  });
}

export async function notifyPaid(shopId: string, order: Order) {
  const driverName = order.driver?.name ?? 'Le livreur';
  const method = order.paymentMethod ? ` (${order.paymentMethod})` : '';
  await notifyUsers(await membersWithRoles(shopId, ['OWNER', 'MANAGER']), {
    title: '💰 Commande encaissée',
    body: `${driverName} a encaissé ${ar(order.totalAmount)}${method} · ${orderLabel(order)}`,
    data: { type: 'order', shopId, orderId: order.id },
  });
}
