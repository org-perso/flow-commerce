-- Up Migration

-- Pseudo of a member in a shop (e.g. "Rado moto"), shown to the other members instead of
-- their account name. NULL: the account name is used. Unique per shop, case-insensitive.
ALTER TABLE shop_members ADD COLUMN nickname VARCHAR(30)
  CHECK (nickname IS NULL OR char_length(btrim(nickname)) >= 2);

-- Existing drivers get a pseudo: their account name when nobody else in the shop uses it,
-- "Livreur 1", "Livreur 2"… otherwise (never their email).
WITH drivers AS (
  SELECT m.shop_id, m.user_id, left(btrim(u.name), 30) AS name,
         row_number() OVER (PARTITION BY m.shop_id ORDER BY m.created_at, m.user_id) AS n,
         count(*) OVER (PARTITION BY m.shop_id, lower(btrim(u.name))) AS same_name
  FROM shop_members m JOIN users u ON u.id = m.user_id
  WHERE m.role = 'DRIVER'
)
UPDATE shop_members m
SET nickname = CASE
  WHEN d.name IS NOT NULL AND char_length(d.name) >= 2 AND d.same_name = 1
       AND NOT EXISTS (
         SELECT 1 FROM shop_members o JOIN users ou ON ou.id = o.user_id
         WHERE o.shop_id = d.shop_id AND o.role <> 'DRIVER'
           AND lower(btrim(ou.name)) = lower(d.name))
    THEN d.name
  ELSE 'Livreur ' || d.n
END
FROM drivers d
WHERE m.shop_id = d.shop_id AND m.user_id = d.user_id;

CREATE UNIQUE INDEX shop_members_shop_id_nickname_key
  ON shop_members (shop_id, lower(nickname)) WHERE nickname IS NOT NULL;

-- Down Migration

DROP INDEX shop_members_shop_id_nickname_key;
ALTER TABLE shop_members DROP COLUMN nickname;
