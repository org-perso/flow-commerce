-- Up Migration

-- Delivery is optional per order: pickup / hand delivery has no place, address or fee.
ALTER TABLE orders RENAME COLUMN address TO delivery_address;
ALTER TABLE orders
  ADD COLUMN is_delivery    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN delivery_place VARCHAR(150),
  ADD COLUMN delivery_note  TEXT,
  -- Where the order came from.
  ADD COLUMN source         VARCHAR(20) CHECK (source IN (
    'FACEBOOK', 'MESSENGER', 'INSTAGRAM', 'WHATSAPP', 'TIKTOK', 'APPEL', 'BOUTIQUE', 'AUTRE'));

UPDATE orders SET is_delivery = (delivery_address IS NOT NULL OR delivery_fee > 0);

ALTER TABLE orders ADD CONSTRAINT orders_delivery_fields_check CHECK (
  is_delivery OR (
    delivery_fee = 0 AND delivery_place IS NULL
    AND delivery_address IS NULL AND delivery_note IS NULL
  )
);
CREATE INDEX orders_shop_id_source_idx ON orders (shop_id, source) WHERE source IS NOT NULL;

-- Down Migration

ALTER TABLE orders
  DROP CONSTRAINT orders_delivery_fields_check,
  DROP COLUMN is_delivery,
  DROP COLUMN delivery_place,
  DROP COLUMN delivery_note,
  DROP COLUMN source;
ALTER TABLE orders RENAME COLUMN delivery_address TO address;
