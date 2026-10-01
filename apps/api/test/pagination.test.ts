import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createProduct, createShop, request, resetDatabase } from './helpers.js';

const alice = auth('alice');
let shopId: string;
const api = (path: string) => `/api/v1/shops/${shopId}${path}`;

beforeEach(async () => {
  await resetDatabase();
  shopId = await createShop(alice);
});

/** Reads the list page by page (size 2): every item once, none skipped. */
async function readAll(path: string, pick: (body: unknown) => { id: string }[]) {
  const seen: string[] = [];
  for (let offset = 0; ; offset += 2) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await request.get(api(`${path}${sep}limit=2&offset=${offset}`)).set(alice);
    const items = pick(res.body);
    seen.push(...items.map((i) => i.id));
    if (items.length < 2) return seen;
  }
}

describe('pagination (limit / offset)', () => {
  it('products: pages cover the list once; no limit still returns everything', async () => {
    for (const name of ['A', 'B', 'C', 'D', 'E']) await createProduct(alice, shopId, { name });
    const all = await request.get(api('/products')).set(alice);
    expect(all.body).toHaveLength(5);
    expect(await readAll('/products', (b) => b as { id: string }[])).toEqual(
      all.body.map((p: { id: string }) => p.id),
    );
  });

  it('customers', async () => {
    for (const name of ['Rasoa', 'Hery', 'Fara', 'Bema', 'Lova']) {
      await request.post(api('/customers')).set(alice).send({ name });
    }
    const all = await request.get(api('/customers')).set(alice);
    expect(all.body).toHaveLength(5);
    expect(await readAll('/customers', (b) => b as { id: string }[])).toEqual(
      all.body.map((c: { id: string }) => c.id),
    );
  });

  it('expenses: the total covers every expense, on every page', async () => {
    for (const amount of [1000, 2000, 3000, 4000, 5000]) {
      await request
        .post(api('/expenses'))
        .set(alice)
        .send({ category: 'AUTRE', amount, date: '2026-09-10' });
    }
    const page = await request.get(api('/expenses?limit=2&offset=4')).set(alice);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.total).toBe(15000);
    const pastEnd = await request.get(api('/expenses?limit=2&offset=10')).set(alice);
    expect(pastEnd.body).toEqual({ items: [], total: 15000 });
    const ids = await readAll('/expenses', (b) => (b as { items: { id: string }[] }).items);
    expect(new Set(ids).size).toBe(5);
  });
});
