-- Up Migration

-- Colors the shop picked for its order states and payment ({ "LIVREE": "emerald", "PAID": "pink" }),
-- from the palette shared by the apps. NULL or a missing key: the default color.
ALTER TABLE shops ADD COLUMN status_colors JSONB;

-- Down Migration

ALTER TABLE shops DROP COLUMN status_colors;
