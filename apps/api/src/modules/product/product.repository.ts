import { pool, type Db } from '../../db/pool.js';
import { buildSet } from '../../db/sql.js';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  category: { id: string; name: string } | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductInput = {
  name: string;
  description: string | null;
  image: string | null;
  categoryId: string | null;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
};

const select = `SELECT p.id, p.name, p.description, p.image,
  CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object('id', c.id, 'name', c.name) END AS category,
  p.purchase_price AS "purchasePrice", p.selling_price AS "sellingPrice",
  p.stock_quantity AS "stockQuantity", p.low_stock_threshold AS "lowStockThreshold",
  (p.stock_quantity <= p.low_stock_threshold) AS "isLowStock",
  p.archived_at AS "archivedAt", p.created_at AS "createdAt", p.updated_at AS "updatedAt"
  FROM products p LEFT JOIN product_categories c ON c.id = p.category_id`;

const updatableColumns = {
  name: 'name',
  description: 'description',
  image: 'image',
  categoryId: 'category_id',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  lowStockThreshold: 'low_stock_threshold',
};

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  lowStock?: boolean;
  archived?: boolean;
};

export async function listProducts(shopId: string, filters: ProductFilters): Promise<Product[]> {
  const conditions = ['p.shop_id = $1'];
  const values: unknown[] = [shopId];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  conditions.push(filters.archived ? 'p.archived_at IS NOT NULL' : 'p.archived_at IS NULL');
  if (filters.q) add('p.name ILIKE ?', `%${filters.q}%`);
  if (filters.categoryId) add('p.category_id = ?', filters.categoryId);
  if (filters.lowStock) conditions.push('p.stock_quantity <= p.low_stock_threshold');

  const { rows } = await pool.query<Product>(
    `${select} WHERE ${conditions.join(' AND ')} ORDER BY p.name, p.id`,
    values,
  );
  return rows;
}

export async function findProduct(
  shopId: string,
  productId: string,
  db: Db = pool,
): Promise<Product | null> {
  const { rows } = await db.query<Product>(`${select} WHERE p.id = $1 AND p.shop_id = $2`, [
    productId,
    shopId,
  ]);
  return rows[0] ?? null;
}

/** Stock starts at 0: initial stock is added through a stock movement. */
export async function insertProduct(db: Db, shopId: string, input: ProductInput): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO products (shop_id, name, description, image, category_id,
       purchase_price, selling_price, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      shopId,
      input.name,
      input.description,
      input.image,
      input.categoryId,
      input.purchasePrice,
      input.sellingPrice,
      input.lowStockThreshold,
    ],
  );
  return rows[0]!.id;
}

export async function updateProduct(
  shopId: string,
  productId: string,
  patch: Partial<ProductInput>,
): Promise<Product | null> {
  const set = buildSet(patch, updatableColumns, 3);
  if (set.sql) {
    await pool.query(`UPDATE products SET ${set.sql} WHERE id = $1 AND shop_id = $2`, [
      productId,
      shopId,
      ...set.values,
    ]);
  }
  return findProduct(shopId, productId);
}

export async function setArchived(
  shopId: string,
  productId: string,
  archived: boolean,
): Promise<Product | null> {
  await pool.query(
    `UPDATE products SET archived_at = ${archived ? 'COALESCE(archived_at, now())' : 'NULL'}
     WHERE id = $1 AND shop_id = $2`,
    [productId, shopId],
  );
  return findProduct(shopId, productId);
}
