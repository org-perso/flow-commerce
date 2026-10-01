import { Router } from 'express';
import { z } from 'zod';

import type { Request } from 'express';

import { currentMember, currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { amount, isoDate, optionalText, pagination, requiredText } from '../../http/schemas.js';
import { phoneField } from '../customer/phone.js';
import { notifyDelivered, notifyPaid } from '../notification/notification.service.js';
import { can, requirePermission } from '../shop/permissions.js';
import {
  assignDriver,
  claimDelivery,
  DRIVER_STATUSES,
  driverCanSee,
  findOwnDelivery,
  releaseDelivery,
  unassignDriver,
} from './delivery.service.js';
import { ORDER_SOURCES } from './order-source.js';
import { ORDER_STATUSES } from './order-status.js';
import { countOrdersByStatus, findOrder, listOrders } from './order.repository.js';
import { changeOrderStatus, createOrder, updateOrder } from './order.service.js';

const items = z
  .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(100_000) }))
  .min(1, 'An order needs at least one item.')
  .max(100);

/** Present when the order is delivered; null for pickup / hand delivery (no fee). */
const delivery = z
  .object({
    place: optionalText(150).default(null),
    address: optionalText(1000).default(null),
    note: optionalText(1000).default(null),
    fee: amount.default(0),
  })
  .nullable();

const createOrderSchema = z
  .object({
    customerId: z.uuid().nullable().default(null),
    /** New or returning customer (matched by phone), instead of customerId. */
    customer: z
      .object({ name: requiredText(150), phone: phoneField.default(null) })
      .nullable()
      .default(null),
    items,
    source: z.enum(ORDER_SOURCES).nullable().default(null),
    /** Planned delivery / hand-over day; defaults to today (Madagascar). */
    scheduledDate: isoDate.nullable().default(null),
    delivery: delivery.default(null),
    paymentMethod: optionalText(30).default(null),
    isPaid: z.boolean().default(false),
    /** Create directly as confirmed to take stock right away. */
    status: z.enum(['EN_ATTENTE', 'CONFIRMEE']).default('EN_ATTENTE'),
  })
  .strict()
  .refine((o) => !(o.customerId && o.customer), {
    message: 'Provide customerId or customer, not both.',
    path: ['customer'],
  });

const updateOrderSchema = z
  .object({
    customerId: z.uuid().nullable(),
    items,
    source: z.enum(ORDER_SOURCES).nullable(),
    scheduledDate: isoDate,
    delivery,
    paymentMethod: optionalText(30),
    isPaid: z.boolean(),
  })
  .partial()
  .strict();

/** What a driver may change on their own delivery: the payment. */
const driverUpdateSchema = updateOrderSchema.pick({ paymentMethod: true, isPaid: true });

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
const driverSchema = z.object({ userId: z.uuid() }).strict();

const filtersQuery = z.object({
  assignment: z.enum(['mine', 'available']).optional(),
  when: z.enum(['today', 'upcoming']).optional(),
  q: z.string().trim().max(150).optional(),
  customerId: z.uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

const listQuery = filtersQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  ...pagination,
});

/** A member who only handles deliveries (driver): limited to their own orders. */
const isDriver = (req: Request) => !can(currentMember(req).role, 'orders');

function scopedFilters<T extends object>(req: Request, filters: T) {
  return { ...filters, viewerId: currentMember(req).userId, driverScope: isDriver(req) };
}

const forbidden = () => new ProblemError(403, 'Forbidden', 'Your role does not allow this action.');

/** /shops/:shopId/orders */
export const ordersRouter = Router();

/**
 * RG-61: a driver never receives what a parcel contains, only its number and amounts.
 * Removes `items` from every order sent to a driver (one order or a list).
 */
ordersRouter.use((req, res, next) => {
  if (isDriver(req)) {
    const json = res.json.bind(res);
    const strip = (o: unknown) => {
      if (o && typeof o === 'object' && 'items' in o) {
        const rest = { ...(o as Record<string, unknown>) };
        delete rest.items;
        return rest;
      }
      return o;
    };
    res.json = (body) => json(Array.isArray(body) ? body.map(strip) : strip(body));
  }
  next();
});

ordersRouter.get('/', async (req, res) => {
  res.json(await listOrders(currentShopId(req), scopedFilters(req, listQuery.parse(req.query))));
});

/** Counts per status for the list filters: { total, byStatus }. Before /:orderId. */
ordersRouter.get('/counts', async (req, res) => {
  const filters = scopedFilters(req, filtersQuery.parse(req.query));
  res.json(await countOrdersByStatus(currentShopId(req), filters));
});

ordersRouter.post('/', requirePermission('orders'), async (req, res) => {
  const order = await createOrder(currentShopId(req), createOrderSchema.parse(req.body));
  res.status(201).location(`${req.baseUrl}/${order.id}`).json(order);
});

ordersRouter.get('/:orderId', async (req, res) => {
  const order = await findOrder(currentShopId(req), idParam(req.params.orderId, 'Order'));
  if (!order || (isDriver(req) && !driverCanSee(order, currentMember(req).userId))) {
    throw notFound('Order');
  }
  res.json(order);
});

ordersRouter.patch('/:orderId', async (req, res) => {
  const shopId = currentShopId(req);
  const orderId = idParam(req.params.orderId, 'Order');
  if (isDriver(req)) {
    const patch = driverUpdateSchema.parse(req.body);
    const before = await findOwnDelivery(shopId, orderId, currentMember(req).userId);
    const order = await updateOrder(shopId, orderId, patch);
    if (!before.isPaid && order.isPaid) await notifyPaid(shopId, order);
    res.json(order);
    return;
  }
  res.json(await updateOrder(shopId, orderId, updateOrderSchema.parse(req.body)));
});

/** Status changes go through here (not PATCH) because they move stock. */
ordersRouter.post('/:orderId/status', async (req, res) => {
  const shopId = currentShopId(req);
  const orderId = idParam(req.params.orderId, 'Order');
  const { status } = statusSchema.parse(req.body);
  if (isDriver(req)) {
    await findOwnDelivery(shopId, orderId, currentMember(req).userId);
    if (!DRIVER_STATUSES.includes(status)) throw forbidden();
  }
  const order = await changeOrderStatus(shopId, orderId, status);
  if (isDriver(req) && status === 'LIVREE') await notifyDelivered(shopId, order);
  res.json(order);
});

/** Assigns a driver (RG-54): owner, manager, CM. */
ordersRouter.put('/:orderId/driver', requirePermission('orders'), async (req, res) => {
  const { userId } = driverSchema.parse(req.body);
  res.json(await assignDriver(currentShopId(req), idParam(req.params.orderId, 'Order'), userId));
});

ordersRouter.delete('/:orderId/driver', requirePermission('orders'), async (req, res) => {
  res.json(await unassignDriver(currentShopId(req), idParam(req.params.orderId, 'Order')));
});

/** A driver takes a delivery still to take (RG-55). */
ordersRouter.post('/:orderId/claim', requirePermission('deliveries'), async (req, res) => {
  const orderId = idParam(req.params.orderId, 'Order');
  res.json(await claimDelivery(currentShopId(req), orderId, currentMember(req).userId));
});

/** A driver gives back one of their deliveries, until it is delivered. */
ordersRouter.post('/:orderId/release', requirePermission('deliveries'), async (req, res) => {
  const orderId = idParam(req.params.orderId, 'Order');
  res.json(await releaseDelivery(currentShopId(req), orderId, currentMember(req).userId));
});
