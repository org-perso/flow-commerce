-- Up Migration

-- Numbers to reach the customer for this order (1 to 3, first = main), for deliveries and
-- pickups alike. delivery_phone stays: it holds the first number of a delivery, as the apps
-- installed before this version read it.
ALTER TABLE orders ADD COLUMN phones VARCHAR(30)[] NOT NULL DEFAULT '{}';

UPDATE orders SET phones = ARRAY[delivery_phone] WHERE delivery_phone IS NOT NULL;

-- Down Migration

ALTER TABLE orders DROP COLUMN phones;
