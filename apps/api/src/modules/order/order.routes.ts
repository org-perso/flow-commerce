import { Router } from 'express';
import { z } from 'zod';

import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { amount, isoDate, optionalText, pagination, requiredText } from '../../http/schemas.js';
import { phoneField } from '../customer/phone.js';
import { ORDER_SOURCES } from './order-source.js';
import { ORDER_STATUSES } from './order-status.js';
import { findOrder, listOrders } from './order.repository.js';
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
  })
  .partial()
  .strict();

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

const listQuery = z.object({
  when: z.enum(['today', 'upcoming']).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  customerId: z.uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  ...pagination,
});

/** /shops/:shopId/orders */
export const ordersRouter = Router();

ordersRouter.get('/', async (req, res) => {
  res.json(await listOrders(currentShopId(req), listQuery.parse(req.query)));
});

ordersRouter.post('/', async (req, res) => {
  const order = await createOrder(currentShopId(req), createOrderSchema.parse(req.body));
  res.status(201).location(`${req.baseUrl}/${order.id}`).json(order);
});

ordersRouter.get('/:orderId', async (req, res) => {
  const order = await findOrder(currentShopId(req), idParam(req.params.orderId, 'Order'));
  if (!order) throw notFound('Order');
  res.json(order);
});

ordersRouter.patch('/:orderId', async (req, res) => {
  const patch = updateOrderSchema.parse(req.body);
  res.json(await updateOrder(currentShopId(req), idParam(req.params.orderId, 'Order'), patch));
});

/** Status changes go through here (not PATCH) because they move stock. */
ordersRouter.post('/:orderId/status', async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  res.json(
    await changeOrderStatus(currentShopId(req), idParam(req.params.orderId, 'Order'), status),
  );
});
