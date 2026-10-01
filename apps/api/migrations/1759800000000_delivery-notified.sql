-- Up Migration

-- Drivers are notified in batches ("Notifier les livreurs"): NULL while the current state of
-- the delivery (assigned to a driver, or to take) has not been announced yet.
ALTER TABLE orders ADD COLUMN delivery_notified_at TIMESTAMPTZ;

-- Existing orders are not announced again.
UPDATE orders SET delivery_notified_at = now();

-- Down Migration

ALTER TABLE orders DROP COLUMN delivery_notified_at;
