import { Router } from 'express';
import { z } from 'zod';

import { businessToday } from '../../config/time.js';
import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { amount, isoDate, optionalText } from '../../http/schemas.js';
import {
  deleteExpense,
  EXPENSE_CATEGORIES,
  findExpense,
  insertExpense,
  listExpenses,
  updateExpense,
} from './expense.repository.js';

const category = z.enum(EXPENSE_CATEGORIES);

const createExpenseSchema = z.object({
  category,
  amount: amount.refine((a) => a > 0, 'Must be positive.'),
  description: optionalText(1000).default(null),
  /** Defaults to today in Indian/Antananarivo. */
  date: isoDate.optional(),
});
const updateExpenseSchema = z
  .object({
    category,
    amount: amount.refine((a) => a > 0, 'Must be positive.'),
    description: optionalText(1000),
    date: isoDate,
  })
  .partial()
  .strict();
const listQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  category: category.optional(),
});

/** /shops/:shopId/expenses */
export const expensesRouter = Router();

/** Returns the expenses and their total for the filters. */
expensesRouter.get('/', async (req, res) => {
  res.json(await listExpenses(currentShopId(req), listQuery.parse(req.query)));
});

expensesRouter.post('/', async (req, res) => {
  const { date, ...input } = createExpenseSchema.parse(req.body);
  const expense = await insertExpense(currentShopId(req), {
    ...input,
    date: date ?? businessToday(),
  });
  res.status(201).location(`${req.baseUrl}/${expense.id}`).json(expense);
});

expensesRouter.get('/:expenseId', async (req, res) => {
  const expense = await findExpense(currentShopId(req), idParam(req.params.expenseId, 'Expense'));
  if (!expense) throw notFound('Expense');
  res.json(expense);
});

expensesRouter.patch('/:expenseId', async (req, res) => {
  const expense = await updateExpense(
    currentShopId(req),
    idParam(req.params.expenseId, 'Expense'),
    updateExpenseSchema.parse(req.body),
  );
  if (!expense) throw notFound('Expense');
  res.json(expense);
});

expensesRouter.delete('/:expenseId', async (req, res) => {
  const deleted = await deleteExpense(currentShopId(req), idParam(req.params.expenseId, 'Expense'));
  if (!deleted) throw notFound('Expense');
  res.status(204).end();
});
