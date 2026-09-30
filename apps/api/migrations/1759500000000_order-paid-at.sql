-- Up Migration
-- When the customer paid; NULL = not paid yet.
ALTER TABLE orders ADD COLUMN paid_at TIMESTAMPTZ;

-- Down Migration
ALTER TABLE orders DROP COLUMN paid_at;
