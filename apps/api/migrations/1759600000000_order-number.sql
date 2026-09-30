-- Up Migration

-- Human order number per shop (#001, #002…), shown to the seller and the customer.
-- shops.last_order_number is the counter: incremented under the shop row lock at insert.
ALTER TABLE shops ADD COLUMN last_order_number INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN number INT;

UPDATE orders o SET number = n.number
FROM (SELECT id, row_number() OVER (PARTITION BY shop_id ORDER BY created_at, id) AS number
      FROM orders) n
WHERE n.id = o.id;
UPDATE shops s SET last_order_number = COALESCE(
  (SELECT max(number) FROM orders o WHERE o.shop_id = s.id), 0);

ALTER TABLE orders ALTER COLUMN number SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_shop_id_number_key UNIQUE (shop_id, number);

-- Down Migration

ALTER TABLE orders DROP COLUMN number;
ALTER TABLE shops DROP COLUMN last_order_number;
