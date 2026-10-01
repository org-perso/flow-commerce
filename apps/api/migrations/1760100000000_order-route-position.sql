-- Up Migration

-- Rank of an order in its driver's round, set when the driver organises it (1, 2, 3...).
-- NULL: not placed yet, the app sorts it by time slot then place. Cleared when the driver changes.
ALTER TABLE orders ADD COLUMN route_position INTEGER;

-- Down Migration

ALTER TABLE orders DROP COLUMN route_position;
