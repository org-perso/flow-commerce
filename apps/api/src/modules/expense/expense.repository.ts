import { pool } from '../../db/pool.js';
import { buildSet } from '../../db/sql.js';

export const EXPENSE_CATEGORIES = [
  'ACHAT_PRODUITS',
  'PUBLICITE',
  'LIVRAISON',
  'EMBALLAGE',
  'TRANSPORT',
  'AUTRE',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  date: string;
};

// `date` is returned as YYYY-MM-DD text, never shifted by a time zone.
const columns = `id, category, amount, description, to_char(date, 'YYYY-MM-DD') AS date,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export type ExpenseFilters = {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
};

export async function listExpenses(
  shopId: string,
  filters: ExpenseFilters,
): Promise<{ items: Expense[]; total: number }> {
  const { rows } = await pool.query<Expense & { grandTotal: number }>(
    `SELECT ${columns}, (sum(amount) OVER ())::bigint AS "grandTotal" FROM expenses
     WHERE shop_id = $1
       AND ($2::date IS NULL OR date >= $2)
       AND ($3::date IS NULL OR date <= $3)
       AND ($4::text IS NULL OR category = $4)
     ORDER BY date DESC, created_at DESC`,
    [shopId, filters.from ?? null, filters.to ?? null, filters.category ?? null],
  );
  return {
    items: rows.map(({ grandTotal: _, ...expense }) => expense),
    total: rows[0]?.grandTotal ?? 0,
  };
}

export async function findExpense(shopId: string, expenseId: string): Promise<Expense | null> {
  const { rows } = await pool.query<Expense>(
    `SELECT ${columns} FROM expenses WHERE id = $1 AND shop_id = $2`,
    [expenseId, shopId],
  );
  return rows[0] ?? null;
}

export async function insertExpense(shopId: string, input: ExpenseInput): Promise<Expense> {
  const { rows } = await pool.query<Expense>(
    `INSERT INTO expenses (shop_id, category, amount, description, date)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
    [shopId, input.category, input.amount, input.description, input.date],
  );
  return rows[0]!;
}

export async function updateExpense(
  shopId: string,
  expenseId: string,
  patch: Partial<ExpenseInput>,
): Promise<Expense | null> {
  const set = buildSet(
    patch,
    { category: 'category', amount: 'amount', description: 'description', date: 'date' },
    3,
  );
  if (!set.sql) return findExpense(shopId, expenseId);
  const { rows } = await pool.query<Expense>(
    `UPDATE expenses SET ${set.sql} WHERE id = $1 AND shop_id = $2 RETURNING ${columns}`,
    [expenseId, shopId, ...set.values],
  );
  return rows[0] ?? null;
}

export async function deleteExpense(shopId: string, expenseId: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1 AND shop_id = $2', [
    expenseId,
    shopId,
  ]);
  return rowCount === 1;
}
