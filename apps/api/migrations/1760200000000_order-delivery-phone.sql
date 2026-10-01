-- Up Migration

-- Number the driver calls for this delivery when the order has no customer card
-- ("client de passage"). With a customer, their main number is used first.
ALTER TABLE orders ADD COLUMN delivery_phone VARCHAR(30);

-- Down Migration

ALTER TABLE orders DROP COLUMN delivery_phone;
