-- Up Migration

-- Team (af-v2): a shop has members with a role; rights come from the role only.
-- shops.owner_id stays as the creator, but access goes through shop_members.
CREATE TABLE shop_members (
  shop_id    UUID NOT NULL REFERENCES shops (id),
  user_id    UUID NOT NULL REFERENCES users (id),
  role       VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CM', 'DRIVER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, user_id)
);
CREATE INDEX shop_members_user_id_idx ON shop_members (user_id);
CREATE TRIGGER shop_members_set_updated_at BEFORE UPDATE ON shop_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO shop_members (shop_id, user_id, role, created_at)
SELECT id, owner_id, 'OWNER', created_at FROM shops;

-- Invitation codes: 6 characters, single use, valid 7 days, never for the OWNER role (RG-52).
CREATE TABLE shop_invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id),
  code       CHAR(6) NOT NULL UNIQUE,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'CM', 'DRIVER')),
  created_by UUID NOT NULL REFERENCES users (id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by    UUID REFERENCES users (id),
  used_at    TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_invitations_shop_id_idx ON shop_invitations (shop_id);

-- Delivery driver of an order: a member of the same shop. Removing the member
-- un-assigns their orders (RG-56) without touching shop_id.
ALTER TABLE orders
  ADD COLUMN assigned_to UUID,
  ADD COLUMN assigned_at TIMESTAMPTZ,
  ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (shop_id, assigned_to)
    REFERENCES shop_members (shop_id, user_id) ON DELETE SET NULL (assigned_to);
CREATE INDEX orders_shop_id_assigned_to_idx ON orders (shop_id, assigned_to);

-- Expo push tokens, one row per device.
CREATE TABLE push_tokens (
  token      VARCHAR(255) PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform   VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user_id_idx ON push_tokens (user_id);

-- Down Migration

DROP TABLE push_tokens;
ALTER TABLE orders DROP CONSTRAINT orders_assigned_to_fkey;
ALTER TABLE orders DROP COLUMN assigned_at, DROP COLUMN assigned_to;
DROP TABLE shop_invitations;
DROP TABLE shop_members;
