-- Up Migration

-- Phones are stored normalized (see src/modules/customer/phone.ts):
-- digits only, Madagascar international prefix turned into the national 0.
UPDATE customers SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '');
UPDATE customers SET phone = '0' || substring(phone FROM 4)
  WHERE phone ~ '^261\d{9}$';

-- The phone identifies a customer within a shop: reused instead of duplicated.
-- Fails if a shop already has two customers with the same phone: merge them first.
DROP INDEX customers_shop_id_phone_idx;
CREATE UNIQUE INDEX customers_shop_id_phone_key ON customers (shop_id, phone)
  WHERE phone IS NOT NULL;

-- Down Migration

DROP INDEX customers_shop_id_phone_key;
CREATE INDEX customers_shop_id_phone_idx ON customers (shop_id, phone) WHERE phone IS NOT NULL;
