-- Up Migration

-- Platform admin space (af-v3-admin). Admins are NOT Firebase users: own accounts, username +
-- password + TOTP (MFA). Seller data is only touched through the new state columns below.

CREATE TABLE admin_users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             VARCHAR(50) NOT NULL CHECK (username ~ '^[a-z0-9._-]{3,50}$'),
  name                 VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
  -- scrypt: "scrypt$N$r$p$salt$hash" (see admin-password.ts).
  password_hash        TEXT NOT NULL,
  -- Set on creation and after a reset by another admin: must be changed at next sign-in.
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  -- TOTP secret, encrypted with ADMIN_MFA_KEY (AES-256-GCM). Set at enrolment start.
  mfa_secret           TEXT,
  -- Enrolment confirmed by a first valid code.
  mfa_enabled_at       TIMESTAMPTZ,
  -- Last accepted TOTP time step: a code is never accepted twice.
  mfa_last_step        BIGINT,
  -- RG: MFA is mandatory unless another admin makes it optional for this account.
  mfa_required         BOOLEAN NOT NULL DEFAULT true,
  disabled_at          TIMESTAMPTZ,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_username_key ON admin_users (username);
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One-time codes for a lost phone, hashed like passwords.
CREATE TABLE admin_recovery_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_recovery_codes_admin_id_idx ON admin_recovery_codes (admin_id);

-- Sessions behind the HttpOnly cookie. Only a SHA-256 of the token is stored.
-- stage 'mfa': password checked, waiting for the code (short-lived); 'full': signed in.
CREATE TABLE admin_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  token_hash   CHAR(64) NOT NULL UNIQUE,
  stage        VARCHAR(10) NOT NULL CHECK (stage IN ('mfa', 'full')),
  ip           VARCHAR(64),
  user_agent   VARCHAR(300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX admin_sessions_admin_id_idx ON admin_sessions (admin_id);

-- Every sign-in attempt (password or code): lockout after repeated failures, and audit.
CREATE TABLE admin_login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  username   VARCHAR(50) NOT NULL,
  ip         VARCHAR(64),
  kind       VARCHAR(10) NOT NULL CHECK (kind IN ('password', 'mfa')),
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_attempts_username_idx ON admin_login_attempts (username, created_at);
CREATE INDEX admin_login_attempts_ip_idx ON admin_login_attempts (ip, created_at);

-- Audit log of admin actions (RG-72). No foreign key on the target: the entry outlives it
-- (a shop deleted with its owner's account keeps its history), hence the label copy.
CREATE TABLE admin_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES admin_users (id),
  action       VARCHAR(40) NOT NULL,
  target_type  VARCHAR(10) NOT NULL CHECK (target_type IN ('shop', 'user', 'admin')),
  target_id    UUID NOT NULL,
  target_label VARCHAR(200),
  reason       VARCHAR(30),
  details      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_target_idx ON admin_actions (target_type, target_id, created_at);

-- Internal notes on a shop, visible to admins only.
CREATE TABLE admin_shop_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES admin_users (id),
  body       TEXT NOT NULL CHECK (btrim(body) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_shop_notes_shop_id_idx ON admin_shop_notes (shop_id, created_at);

-- Warnings sent to a shop's owners, shown in the app until read (RG-77).
CREATE TABLE shop_notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES admin_users (id),
  reason     VARCHAR(30) NOT NULL,
  message    TEXT NOT NULL CHECK (btrim(message) <> ''),
  read_at    TIMESTAMPTZ,
  read_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_notices_shop_id_idx ON shop_notices (shop_id, created_at);

-- State set by admins. Defaults keep every existing shop and user as they are.
ALTER TABLE shops
  ADD COLUMN status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                              CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  ADD COLUMN suspended_reason TEXT,
  ADD COLUMN flagged_at       TIMESTAMPTZ,
  ADD COLUMN flag_reason      TEXT,
  -- Subscriptions (F-24) are prepared, not enforced yet: everyone is FREE without limits.
  ADD COLUMN plan             VARCHAR(20) NOT NULL DEFAULT 'FREE'
                              CHECK (plan IN ('FREE', 'PRO', 'BUSINESS'));

ALTER TABLE users
  ADD COLUMN suspended_at     TIMESTAMPTZ,
  ADD COLUMN suspended_reason TEXT;

-- Down Migration

ALTER TABLE users DROP COLUMN suspended_reason, DROP COLUMN suspended_at;
ALTER TABLE shops
  DROP COLUMN plan, DROP COLUMN flag_reason, DROP COLUMN flagged_at,
  DROP COLUMN suspended_reason, DROP COLUMN status;
DROP TABLE shop_notices;
DROP TABLE admin_shop_notes;
DROP TABLE admin_actions;
DROP TABLE admin_login_attempts;
DROP TABLE admin_sessions;
DROP TABLE admin_recovery_codes;
DROP TABLE admin_users;
