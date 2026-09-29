import { Router } from 'express';
import { z } from 'zod';

import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { ProblemError } from '../../http/problem.js';
import { optionalText, requiredText } from '../../http/schemas.js';
import { phoneField } from './phone.js';
import {
  deleteCustomer,
  findCustomer,
  insertCustomer,
  listCustomers,
  updateCustomer,
} from './customer.repository.js';

const createCustomerSchema = z.object({
  name: requiredText(150),
  phone: phoneField.default(null),
  address: optionalText(1000).default(null),
});
const updateCustomerSchema = z
  .object({ name: requiredText(150), phone: phoneField, address: optionalText(1000) })
  .partial()
  .strict();
const listQuery = z.object({ q: z.string().trim().max(150).optional() });

/** /shops/:shopId/customers */
export const customersRouter = Router();

customersRouter.get('/', async (req, res) => {
  const { q } = listQuery.parse(req.query);
  res.json(await listCustomers(currentShopId(req), q || undefined));
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
