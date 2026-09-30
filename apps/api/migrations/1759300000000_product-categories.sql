-- Up Migration

-- Product categories become a per-shop list the seller picks from (and can extend).
-- Every shop starts with a standard list; see DEFAULT_CATEGORIES in the API.
CREATE TABLE product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id),
  name       VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, shop_id)
);
-- One category per name in a shop, whatever the case ("Beauté" = "beauté").
CREATE UNIQUE INDEX product_categories_shop_id_name_key
  ON product_categories (shop_id, lower(name));

-- Standard list for existing shops (a snapshot: later changes live in the API).
INSERT INTO product_categories (shop_id, name)
SELECT s.id, c.name
FROM shops s
CROSS JOIN (VALUES
  ('Vêtements'), ('Chaussures'), ('Sacs et accessoires'), ('Bijoux'),
  ('Beauté et cosmétiques'), ('Hygiène'), ('Alimentation'), ('Boissons'),
  ('Électronique'), ('Maison'), ('Enfants et bébés'), ('Autre')
) AS c (name);

-- Keep the free-text categories already typed on products.
INSERT INTO product_categories (shop_id, name)
SELECT DISTINCT shop_id, btrim(category) FROM products
WHERE category IS NOT NULL AND btrim(category) <> ''
ON CONFLICT (shop_id, (lower(name))) DO NOTHING;

ALTER TABLE products ADD COLUMN category_id UUID;
UPDATE products p SET category_id = c.id
FROM product_categories c
WHERE c.shop_id = p.shop_id AND lower(c.name) = lower(btrim(p.category));
ALTER TABLE products
  ADD FOREIGN KEY (category_id, shop_id) REFERENCES product_categories (id, shop_id),
  DROP COLUMN category;
CREATE INDEX products_category_id_idx ON products (category_id) WHERE category_id IS NOT NULL;

-- Down Migration

ALTER TABLE products ADD COLUMN category VARCHAR(100);
UPDATE products p SET category = c.name FROM product_categories c WHERE c.id = p.category_id;
ALTER TABLE products DROP COLUMN category_id;
DROP TABLE product_categories;
