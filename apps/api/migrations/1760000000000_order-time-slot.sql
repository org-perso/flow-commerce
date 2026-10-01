-- Up Migration

-- Time slot of the planned day (Madagascar time): "before 11:00" (to only), "after 17:00"
-- (from only), "14:00-16:00" (both). Both NULL: any time of the day.
ALTER TABLE orders
  ADD COLUMN slot_from TIME,
  ADD COLUMN slot_to TIME,
  ADD CONSTRAINT orders_slot_order_check
    CHECK (slot_from IS NULL OR slot_to IS NULL OR slot_from < slot_to);

-- Down Migration

ALTER TABLE orders DROP CONSTRAINT orders_slot_order_check;
ALTER TABLE orders DROP COLUMN slot_to, DROP COLUMN slot_from;
