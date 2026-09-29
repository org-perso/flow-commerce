import { pool, type Db } from '../../db/pool.js';
import { buildSet } from '../../db/sql.js';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string | null;
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
  category: string | null;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
};

const columns = `id, name, description, image, category,
  purchase_price AS "purchasePrice", selling_price AS "sellingPrice",
  stock_quantity AS "stockQuantity", low_stock_threshold AS "lowStockThreshold",
  (stock_quantity <= low_stock_threshold) AS "isLowStock",
  archived_at AS "archivedAt", created_at AS "createdAt", updated_at AS "updatedAt"`;

const updatableColumns = {
  name: 'name',
  description: 'description',
  image: 'image',
  category: 'category',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  lowStockThreshold: 'low_stock_threshold',
};

export type ProductFilters = {
  q?: string;
  category?: string;
  lowStock?: boolean;
  archived?: boolean;
};

export async function listProducts(shopId: string, filters: ProductFilters): Promise<Product[]> {
  const conditions = ['shop_id = $1'];
  const values: unknown[] = [shopId];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  conditions.push(filters.archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL');
  if (filters.q) add('name ILIKE ?', `%${filters.q}%`);
  if (filters.category) add('category = ?', filters.category);
  if (filters.lowStock) conditions.push('stock_quantity <= low_stock_threshold');

  const { rows } = await pool.query<Product>(
    `SELECT ${columns} FROM products WHERE ${conditions.join(' AND ')} ORDER BY name, id`,
    values,
  );
  return rows;
}

export async function findProduct(
  shopId: string,
  productId: string,
  db: Db = pool,
): Promise<Product | null> {
  const { rows } = await db.query<Product>(
    `SELECT ${columns} FROM products WHERE id = $1 AND shop_id = $2`,
    [productId, shopId],
  );
  return rows[0] ?? null;
}

/** Stock starts at 0: initial stock is added through a stock movement. */
export async function insertProduct(db: Db, shopId: string, input: ProductInput): Promise<Product> {
  const { rows } = await db.query<Product>(
    `INSERT INTO products (shop_id, name, description, image, category,
       purchase_price, selling_price, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${columns}`,
    [
      shopId,
      input.name,
      input.description,
      input.image,
      input.category,
      input.purchasePrice,
      input.sellingPrice,
      input.lowStockThreshold,
    ],
  );
  return rows[0]!;
}

export async function updateProduct(
  shopId: string,
  productId: string,
  patch: Partial<ProductInput>,
): Promise<Product | null> {
  const set = buildSet(patch, updatableColumns, 3);
  if (!set.sql) return findProduct(shopId, productId);
  const { rows } = await pool.query<Product>(
    `UPDATE products SET ${set.sql} WHERE id = $1 AND shop_id = $2 RETURNING ${columns}`,
    [productId, shopId, ...set.values],
  );
  return rows[0] ?? null;
}

export async function setArchived(
  shopId: string,
  productId: string,
  archived: boolean,
): Promise<Product | null> {
  const { rows } = await pool.query<Product>(
    `UPDATE products SET archived_at = ${archived ? 'COALESCE(archived_at, now())' : 'NULL'}
     WHERE id = $1 AND shop_id = $2
     RETURNING ${columns}`,
    [productId, shopId],
  );
  return rows[0] ?? null;
}
