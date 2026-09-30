import { Router } from 'express';

import { withTransaction } from '../../db/pool.js';
import { currentShopId } from '../../http/context.js';
import { idParam, notFound } from '../../http/params.js';
import { applyStockMovement, listStockMovements } from '../stock/stock.service.js';
import {
  findProduct,
  insertProduct,
  listProducts,
  setArchived,
  updateProduct,
} from './product.repository.js';
import {
  createProductSchema,
  createStockMovementSchema,
  listMovementsQuery,
  listProductsQuery,
  updateProductSchema,
} from './product.schemas.js';

/** /shops/:shopId/products */
export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const filters = listProductsQuery.parse(req.query);
  res.json(await listProducts(currentShopId(req), filters));
});

productsRouter.post('/', async (req, res) => {
  const shopId = currentShopId(req);
  const { initialStock, ...input } = createProductSchema.parse(req.body);

  const product = await withTransaction(async (client) => {
    const productId = await insertProduct(client, shopId, input);
    if (initialStock > 0) {
      await applyStockMovement(client, {
        shopId,
        productId,
        type: 'AJOUT',
        quantity: initialStock,
        reason: 'Stock initial',
      });
    }
    return (await findProduct(shopId, productId, client))!;
  });

  res.status(201).location(`${req.baseUrl}/${product.id}`).json(product);
});

productsRouter.get('/:productId', async (req, res) => {
  const product = await findProduct(currentShopId(req), idParam(req.params.productId, 'Product'));
  if (!product) throw notFound('Product');
  res.json(product);
});

productsRouter.patch('/:productId', async (req, res) => {
  const patch = updateProductSchema.parse(req.body);
  const product = await updateProduct(
    currentShopId(req),
    idParam(req.params.productId, 'Product'),
    patch,
  );
  if (!product) throw notFound('Product');
  res.json(product);
});

/** Archives (soft delete): archived products disappear from lists and cannot be ordered. */
productsRouter.delete('/:productId', async (req, res) => {
  const product = await setArchived(
    currentShopId(req),
    idParam(req.params.productId, 'Product'),
    true,
  );
  if (!product) throw notFound('Product');
  res.status(204).end();
});

productsRouter.post('/:productId/restore', async (req, res) => {
  const product = await setArchived(
    currentShopId(req),
    idParam(req.params.productId, 'Product'),
    false,
  );
  if (!product) throw notFound('Product');
  res.json(product);
});

productsRouter.get('/:productId/stock-movements', async (req, res) => {
  const shopId = currentShopId(req);
  const productId = idParam(req.params.productId, 'Product');
  if (!(await findProduct(shopId, productId))) throw notFound('Product');
  res.json(await listStockMovements(shopId, productId, listMovementsQuery.parse(req.query)));
});

productsRouter.post('/:productId/stock-movements', async (req, res) => {
  const shopId = currentShopId(req);
  const productId = idParam(req.params.productId, 'Product');
  const { type, quantity, reason } = createStockMovementSchema.parse(req.body);

  const result = await withTransaction((client) =>
    applyStockMovement(client, {
      shopId,
      productId,
      type,
      quantity: type === 'RETRAIT' ? -quantity : quantity,
      reason,
    }),
  );
  res.status(201).json(result);
});
