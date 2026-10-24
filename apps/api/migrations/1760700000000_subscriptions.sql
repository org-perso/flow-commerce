-- Up Migration

-- Subscriptions (docs/subscription.md). shops.plan already exists (FREE by default): a paid
-- plan now has an end. NULL end on a paid plan: given without limit by an admin.
ALTER TABLE shops ADD COLUMN plan_ends_at TIMESTAMPTZ;

-- Mobile Money payments declared by the owners, validated by hand in the admin space.
CREATE TABLE subscription_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  plan            VARCHAR(20) NOT NULL CHECK (plan IN ('PRO', 'BUSINESS')),
  months          SMALLINT NOT NULL CHECK (months IN (1, 3, 12)),
  amount          BIGINT NOT NULL CHECK (amount > 0),
  operator        VARCHAR(20) NOT NULL CHECK (operator IN ('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY')),
  reference       VARCHAR(50) NOT NULL CHECK (btrim(reference) <> ''),
  payer_phone     VARCHAR(30),
  status          VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'VALIDATED', 'REJECTED')),
  reject_reason   TEXT,
  declared_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  reviewed_by     UUID REFERENCES admin_users (id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscription_payments_shop_idx ON subscription_payments (shop_id, created_at);
CREATE INDEX subscription_payments_status_idx ON subscription_payments (status, created_at);
-- RG-93: one transaction reference per operator, unless it was refused (typo, retry).
CREATE UNIQUE INDEX subscription_payments_reference_key
  ON subscription_payments (operator, upper(reference)) WHERE status <> 'REJECTED';

-- Down Migration

DROP TABLE subscription_payments;
ALTER TABLE shops DROP COLUMN plan_ends_at;
