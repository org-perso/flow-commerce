import { pool, type Db } from '../../db/pool.js';
import { ProblemError } from '../../http/problem.js';

/** Standard categories every new shop starts with (the seller can add more). */
export const DEFAULT_CATEGORIES = [
  'Vêtements',
  'Chaussures',
  'Sacs et accessoires',
  'Bijoux',
  'Beauté et cosmétiques',
  'Hygiène',
  'Alimentation',
  'Boissons',
  'Électronique',
  'Maison',
  'Enfants et bébés',
  'Autre',
] as const;

export type Category = { id: string; name: string };

export async function listCategories(shopId: string): Promise<Category[]> {
  const { rows } = await pool.query<Category>(
    `SELECT id, name FROM product_categories WHERE shop_id = $1
     ORDER BY name = 'Autre', lower(name)`,
    [shopId],
  );
  return rows;
}

export async function seedDefaultCategories(db: Db, shopId: string): Promise<void> {
  await db.query(
    `INSERT INTO product_categories (shop_id, name) SELECT $1, unnest($2::text[])
     ON CONFLICT (shop_id, (lower(name))) DO NOTHING`,
    [shopId, DEFAULT_CATEGORIES],
  );
}

/** Creates a category; a name that already exists (any case) is a 409 pointing at it. */
export async function insertCategory(shopId: string, name: string): Promise<Category> {
  const { rows } = await pool.query<Category>(
    `INSERT INTO product_categories (shop_id, name) VALUES ($1, $2)
     ON CONFLICT (shop_id, (lower(name))) DO NOTHING
     RETURNING id, name`,
    [shopId, name],
  );
  if (rows[0]) return rows[0];

  const existing = await pool.query<Category>(
    `SELECT id, name FROM product_categories WHERE shop_id = $1 AND lower(name) = lower($2)`,
    [shopId, name],
  );
  throw new ProblemError(409, 'Duplicate Category', 'This category already exists.', {
    categoryId: existing.rows[0]?.id,
  });
}
