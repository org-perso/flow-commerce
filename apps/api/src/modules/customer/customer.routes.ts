import { Router } from 'express';
import { z } from 'zod';

import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { optionalPagination, optionalText, requiredText } from '../../http/schemas.js';
import {
  countUnlinkedOrders,
  deleteCustomer,
  findCustomer,
  insertCustomer,
  listCustomers,
  updateCustomer,
} from './customer.repository.js';
import { phoneField } from './phone.js';

/** Normalized, non-empty, without duplicates. */
const phones = z
  .array(phoneField)
  .max(5, 'Five phone numbers at most.')
  .transform((list) => [...new Set(list.filter((p): p is string => p !== null))]);

const createCustomerSchema = z
  .object({
    name: requiredText(150),
    phones: phones.default([]),
    socialProfile: optionalText(255).default(null),
  })
  .strict();
const updateCustomerSchema = z
  .object({ name: requiredText(150), phones, socialProfile: optionalText(255) })
  .partial()
  .strict();
const listQuery = z.object({
  q: z.string().trim().max(150).optional(),
  ...optionalPagination,
});

/** /shops/:shopId/customers */
export const customersRouter = Router();

customersRouter.get('/', async (req, res) => {
  const { q, ...page } = listQuery.parse(req.query);
  res.json(await listCustomers(currentShopId(req), q || undefined, page));
});

/** Orders to link to a customer file (banner on the customer list). Before /:customerId. */
customersRouter.get('/unlinked-orders-count', async (req, res) => {
  res.json({ count: await countUnlinkedOrders(currentShopId(req)) });
});

customersRouter.post('/', async (req, res) => {
  const customer = await insertCustomer(currentShopId(req), createCustomerSchema.parse(req.body));
  res.status(201).location(`${req.baseUrl}/${customer.id}`).json(customer);
});

customersRouter.get('/:customerId', async (req, res) => {
  const customer = await findCustomer(
    currentShopId(req),
    idParam(req.params.customerId, 'Customer'),
  );
  if (!customer) throw notFound('Customer');
  res.json(customer);
});

customersRouter.patch('/:customerId', async (req, res) => {
  const customer = await updateCustomer(
    currentShopId(req),
    idParam(req.params.customerId, 'Customer'),
    updateCustomerSchema.parse(req.body),
  );
  if (!customer) throw notFound('Customer');
  res.json(customer);
});

customersRouter.delete('/:customerId', async (req, res) => {
  const result = await deleteCustomer(
    currentShopId(req),
    idParam(req.params.customerId, 'Customer'),
  );
  if (result === 'not_found') throw notFound('Customer');
  if (result === 'has_orders') {
    throw new ProblemError(409, 'Conflict', 'This customer has orders and cannot be deleted.');
  }
  res.status(204).end();
});
