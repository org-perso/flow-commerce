-- Up Migration

-- Amounts are integer Ariary (BIGINT). Every business table carries shop_id (multi-tenant).

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255),
  name         VARCHAR(150),
  phone        VARCHAR(30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- MVP 1: one shop per user.
  owner_id    UUID NOT NULL UNIQUE REFERENCES users (id),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops (id),
  name                VARCHAR(150) NOT NULL,
  description         TEXT,
  image               VARCHAR(500),
  category            VARCHAR(100),
  purchase_price      BIGINT NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price       BIGINT NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  -- Only changed through stock_movements, with an atomic guarded UPDATE.
  stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  -- Soft delete: products are archived, never deleted.
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_shop_id_idx ON products (shop_id) WHERE archived_at IS NULL;

CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id),
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(30),
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customers_shop_id_idx ON customers (shop_id);

CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops (id),
  customer_id    UUID REFERENCES customers (id),
  status         VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN (
                   'EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON',
                   'LIVREE', 'ANNULEE', 'RETOUR')),
  total_amount   BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  delivery_fee   BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  payment_method VARCHAR(30),
  address        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_shop_id_created_at_idx ON orders (shop_id, created_at DESC);
CREATE INDEX orders_shop_id_status_idx ON orders (shop_id, status);

CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products (id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  -- Prices frozen at order time: historical figures never use the current product price.
  unit_selling_price  BIGINT NOT NULL CHECK (unit_selling_price >= 0),
  unit_purchase_price BIGINT NOT NULL CHECK (unit_purchase_price >= 0),
  subtotal            BIGINT NOT NULL CHECK (subtotal = quantity * unit_selling_price)
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops (id),
  category    VARCHAR(30) NOT NULL CHECK (category IN (
                'ACHAT_PRODUITS', 'PUBLICITE', 'LIVRAISON', 'EMBALLAGE', 'TRANSPORT', 'AUTRE')),
  amount      BIGINT NOT NULL CHECK (amount >= 0),
  description TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_shop_id_date_idx ON expenses (shop_id, date DESC);

CREATE TABLE stock_movements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id),
  product_id UUID NOT NULL REFERENCES products (id),
  type       VARCHAR(20) NOT NULL CHECK (type IN (
               'AJOUT', 'RETRAIT', 'AJUSTEMENT', 'VENTE', 'RETOUR')),
  -- Signed: positive adds stock, negative removes it.
  quantity   INTEGER NOT NULL CHECK (quantity <> 0),
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_product_id_idx ON stock_movements (product_id, created_at DESC);

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
