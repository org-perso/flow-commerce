-- Up Migration

-- Shop logo (Cloudinary URL). NULL: the apps show the shop's initial, as before.
ALTER TABLE shops ADD COLUMN logo VARCHAR(500);

-- Down Migration

ALTER TABLE shops DROP COLUMN logo;
