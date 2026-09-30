-- Up Migration

-- A customer can have several phone numbers. Each number (normalized, see phone.ts)
-- still identifies one customer within a shop.
CREATE TABLE customer_phones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL,
  customer_id UUID NOT NULL,
  phone       VARCHAR(30) NOT NULL CHECK (phone ~ '^\d{6,15}$'),
  -- Display order: position 1 is the main number.
  position    SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (customer_id, shop_id) REFERENCES customers (id, shop_id) ON DELETE CASCADE,
  UNIQUE (shop_id, phone)
);
CREATE INDEX customer_phones_customer_id_idx ON customer_phones (customer_id, position);

INSERT INTO customer_phones (shop_id, customer_id, phone, created_at)
SELECT shop_id, id, phone, created_at FROM customers WHERE phone IS NOT NULL;

-- The delivery address belongs to each order, not to the customer.
-- The customer gets a social profile instead (Facebook name, link, @handle…).
DROP INDEX customers_shop_id_phone_key;
ALTER TABLE customers
  DROP COLUMN phone,
  DROP COLUMN address,
  ADD COLUMN social_profile VARCHAR(255);

-- Down Migration

ALTER TABLE customers
  ADD COLUMN phone VARCHAR(30),
  ADD COLUMN address TEXT,
  DROP COLUMN social_profile;
UPDATE customers c SET phone = (
  SELECT phone FROM customer_phones p WHERE p.customer_id = c.id ORDER BY position LIMIT 1
);
CREATE UNIQUE INDEX customers_shop_id_phone_key ON customers (shop_id, phone)
  WHERE phone IS NOT NULL;
DROP TABLE customer_phones;
