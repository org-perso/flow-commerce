import { Router } from 'express';
import { z } from 'zod';

import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { amount, isoDate, optionalText, pagination } from '../../http/schemas.js';
import { ORDER_STATUSES } from './order-status.js';
import { findOrder, listOrders } from './order.repository.js';
import { changeOrderStatus, createOrder, updateOrder } from './order.service.js';

const items = z
  .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(100_000) }))
  .min(1, 'An order needs at least one item.')
  .max(100);

const createOrderSchema = z.object({
  customerId: z.uuid().nullable().default(null),
  items,
  deliveryFee: amount.default(0),
  paymentMethod: optionalText(30).default(null),
  /** Defaults to the customer's address. */
  address: optionalText(1000).default(null),
  /** Create directly as confirmed to take stock right away. */
  status: z.enum(['EN_ATTENTE', 'CONFIRMEE']).default('EN_ATTENTE'),
});

const updateOrderSchema = z
  .object({
    customerId: z.uuid().nullable(),
    items,
    deliveryFee: amount,
    paymentMethod: optionalText(30),
    address: optionalText(1000),
  })
  .partial()
  .strict();

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

const listQuery = z.object({
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
