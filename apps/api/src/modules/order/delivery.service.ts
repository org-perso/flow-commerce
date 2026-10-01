import { pool } from '../../db/pool.js';
import { notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { OPEN_STATUSES, type OrderStatus } from './order-status.js';
import { findOrder, type Order } from './order.repository.js';

/** Statuses a driver may set on their own deliveries. */
export const DRIVER_STATUSES: readonly OrderStatus[] = ['EN_LIVRAISON', 'LIVREE', 'RETOUR'];

const conflict = (detail: string, code: string) =>
  new ProblemError(409, 'Conflict', detail, { code });

/** A driver sees their deliveries and the ones still to take, nothing else. */
export function driverCanSee(order: Order, driverId: string): boolean {
  if (order.driver) return order.driver.userId === driverId;
  return order.delivery !== null && OPEN_STATUSES.includes(order.status);
}

/** Orders of a driver: 404 for anything that is not theirs. */
export async function findOwnDelivery(
  shopId: string,
  orderId: string,
  driverId: string,
): Promise<Order> {
  const order = await findOrder(shopId, orderId);
  if (!order || order.driver?.userId !== driverId) throw notFound('Order');
  return order;
}

async function assertAssignable(shopId: string, orderId: string): Promise<void> {
  const order = await findOrder(shopId, orderId);
  if (!order) throw notFound('Order');
  if (!order.delivery) {
    throw conflict('Only an order with delivery can have a driver.', 'NOT_A_DELIVERY');
  }
  if (!OPEN_STATUSES.includes(order.status)) {
    throw conflict('This order is already done.', 'ORDER_DONE');
  }
}

/** RG-54: delivery orders only, to a member of the shop with the driver role. */
export async function assignDriver(
  shopId: string,
  orderId: string,
  driverId: string,
): Promise<Order> {
  await assertAssignable(shopId, orderId);
  const { rows } = await pool.query(
    `SELECT 1 FROM shop_members WHERE shop_id = $1 AND user_id = $2 AND role = 'DRIVER'`,
    [shopId, driverId],
  );
  if (!rows[0]) {
    throw new ProblemError(422, 'Unprocessable Content', 'This member is not a driver.', {
      code: 'NOT_A_DRIVER',
    });
  }
  await pool.query(
    `UPDATE orders SET assigned_to = $3, assigned_at = now(), delivery_notified_at = NULL
     WHERE id = $1 AND shop_id = $2`,
    [orderId, shopId, driverId],
  );
  return (await findOrder(shopId, orderId))!;
}

export async function unassignDriver(shopId: string, orderId: string): Promise<Order> {
  await assertAssignable(shopId, orderId);
  await pool.query(
    `UPDATE orders SET assigned_to = NULL, assigned_at = NULL, delivery_notified_at = NULL
     WHERE id = $1 AND shop_id = $2`,
    [orderId, shopId],
  );
  return (await findOrder(shopId, orderId))!;
}

/**
 * RG-55: a driver takes an unassigned open delivery. The guarded UPDATE makes it atomic:
 * of two drivers taking it at once, only the first one gets it.
 */
export async function claimDelivery(
  shopId: string,
  orderId: string,
  driverId: string,
): Promise<Order> {
  const { rowCount } = await pool.query(
    `UPDATE orders SET assigned_to = $3, assigned_at = now(), delivery_notified_at = now()
     WHERE id = $1 AND shop_id = $2
       AND assigned_to IS NULL AND is_delivery AND status = ANY($4)`,
    [orderId, shopId, driverId, OPEN_STATUSES],
  );
  if (rowCount === 0) {
    // Taken by someone else in the meantime: say so; anything else is not a delivery to take.
    const order = await findOrder(shopId, orderId);
    if (order?.driver && order.driver.userId !== driverId && OPEN_STATUSES.includes(order.status)) {
      throw conflict('This delivery has already been taken.', 'ALREADY_TAKEN');
    }
    throw notFound('Order');
  }
  return (await findOrder(shopId, orderId))!;
}

/** A driver gives back one of their deliveries, until it is delivered: it is to take again. */
export async function releaseDelivery(
  shopId: string,
  orderId: string,
  driverId: string,
): Promise<Order> {
  const order = await findOwnDelivery(shopId, orderId, driverId);
  if (!OPEN_STATUSES.includes(order.status)) {
    throw conflict('This order is already done.', 'ORDER_DONE');
  }
  await pool.query(
    `UPDATE orders SET assigned_to = NULL, assigned_at = NULL, delivery_notified_at = NULL
     WHERE id = $1 AND shop_id = $2 AND assigned_to = $3`,
    [orderId, shopId, driverId],
  );
  return (await findOrder(shopId, orderId))!;
}
