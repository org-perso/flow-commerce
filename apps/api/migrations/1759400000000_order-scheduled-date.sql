-- Up Migration

-- Day the order is planned for (delivery or hand-over), in Indian/Antananarivo.
-- Drives the "today / upcoming" views; revenue still uses the creation date.
ALTER TABLE orders ADD COLUMN scheduled_date DATE;
UPDATE orders SET scheduled_date = (created_at AT TIME ZONE 'Indian/Antananarivo')::date;
ALTER TABLE orders
  ALTER COLUMN scheduled_date SET NOT NULL,
  ALTER COLUMN scheduled_date SET DEFAULT (now() AT TIME ZONE 'Indian/Antananarivo')::date;
CREATE INDEX orders_shop_id_scheduled_date_idx ON orders (shop_id, scheduled_date);

-- Down Migration

ALTER TABLE orders DROP COLUMN scheduled_date;
