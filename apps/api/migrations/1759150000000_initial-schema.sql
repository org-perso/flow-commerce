-- Up Migration

-- Conventions
-- - Amounts are integer Ariary (BIGINT), never floating point.
-- - A user owns one or more shops. Every business row carries shop_id.
-- - Cross-shop references are impossible: child rows point to their parent with a
--   composite foreign key (id, shop_id), so an order can only use customers and
--   products of its own shop, even if the application code has a bug.

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users ---------------------------------------------------------------------

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255),
  name         VARCHAR(150),
  phone        VARCHAR(30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shops ---------------------------------------------------------------------

CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users (id),
  name        VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shops_owner_id_idx ON shops (owner_id);

-- Products ------------------------------------------------------------------

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops (id),
  name                VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  description         TEXT,
  image               VARCHAR(500),
  category            VARCHAR(100),
  purchase_price      BIGINT NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price       BIGINT NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  -- Only changed together with a stock_movements row, in the same transaction,
  -- with a guarded UPDATE (... WHERE stock_quantity >= :q).
  stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  -- Soft delete: products are archived, never deleted (orders keep referencing them).
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, shop_id)
);
CREATE INDEX products_shop_id_name_idx ON products (shop_id, name) WHERE archived_at IS NULL;

-- Customers -----------------------------------------------------------------

CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id),
  name       VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  phone      VARCHAR(30),
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, shop_id)
);
CREATE INDEX customers_shop_id_name_idx ON customers (shop_id, name);
CREATE INDEX customers_shop_id_phone_idx ON customers (shop_id, phone) WHERE phone IS NOT NULL;

-- Orders --------------------------------------------------------------------

CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops (id),
  -- Optional: a quick order can be created without a saved customer.
  customer_id    UUID,
  status         VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN (
                   'EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON',
                   'LIVREE', 'ANNULEE', 'RETOUR')),
  total_amount   BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  delivery_fee   BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  payment_method VARCHAR(30),
  address        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, shop_id),
  FOREIGN KEY (customer_id, shop_id) REFERENCES customers (id, shop_id)
);
CREATE INDEX orders_shop_id_created_at_idx ON orders (shop_id, created_at DESC);
CREATE INDEX orders_shop_id_status_idx ON orders (shop_id, status);
CREATE INDEX orders_customer_id_idx ON orders (customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Denormalized so the composite keys below keep order and product in the same shop.
  shop_id             UUID NOT NULL,
  order_id            UUID NOT NULL,
  product_id          UUID NOT NULL,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  -- Prices frozen at order time: history never uses the current product price.
  unit_selling_price  BIGINT NOT NULL CHECK (unit_selling_price >= 0),
  unit_purchase_price BIGINT NOT NULL CHECK (unit_purchase_price >= 0),
  subtotal            BIGINT NOT NULL CHECK (subtotal = quantity * unit_selling_price),
  FOREIGN KEY (order_id, shop_id) REFERENCES orders (id, shop_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id, shop_id) REFERENCES products (id, shop_id)
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

-- Expenses ------------------------------------------------------------------

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops (id),
  category    VARCHAR(30) NOT NULL CHECK (category IN (
                'ACHAT_PRODUITS', 'PUBLICITE', 'LIVRAISON', 'EMBALLAGE', 'TRANSPORT', 'AUTRE')),
  amount      BIGINT NOT NULL CHECK (amount >= 0),
  description TEXT,
  -- Business date in Indian/Antananarivo (not a timestamp).
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_shop_id_date_idx ON expenses (shop_id, date DESC);

-- Stock movements -----------------------------------------------------------

CREATE TABLE stock_movements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL,
  product_id UUID NOT NULL,
  -- Set for VENTE / RETOUR and for the inverse movement of a cancellation.
  order_id   UUID,
  type       VARCHAR(20) NOT NULL CHECK (type IN (
               'AJOUT', 'RETRAIT', 'AJUSTEMENT', 'VENTE', 'RETOUR')),
  -- Signed delta applied to products.stock_quantity.
  quantity   INTEGER NOT NULL CHECK (quantity <> 0),
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (product_id, shop_id) REFERENCES products (id, shop_id),
  FOREIGN KEY (order_id, shop_id) REFERENCES orders (id, shop_id),
  -- The sign must match the type; AJUSTEMENT (inventory correction) can go both ways.
  CHECK (
    (type IN ('AJOUT', 'RETOUR') AND quantity > 0)
    OR (type IN ('RETRAIT', 'VENTE') AND quantity < 0)
    OR type = 'AJUSTEMENT'
  )
);
CREATE INDEX stock_movements_product_id_idx ON stock_movements (product_id, created_at DESC);
CREATE INDEX stock_movements_order_id_idx ON stock_movements (order_id) WHERE order_id IS NOT NULL;

-- updated_at triggers -------------------------------------------------------

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE stock_movements;
DROP TABLE expenses;
DROP TABLE order_items;
DROP TABLE orders;
DROP TABLE customers;
DROP TABLE products;
DROP TABLE shops;
DROP TABLE users;
DROP FUNCTION set_updated_at();
