# CLAUDE.md — FlowCommerce

App mobile de gestion pour vendeurs en ligne (Facebook, Instagram, WhatsApp), marché initial : Madagascar.
Promesse : « De la commande au bénéfice, directement depuis votre téléphone. »

## Références

- **Fonctionnel** (ce que fait l'app, règles RG-xx) : `docs/af-v1.md` (MVP, 1.0.x), `docs/af-v2.md` (équipe, rôles, hors ligne, 1.1–1.2). Toute règle métier vient de là ; en cas de doute, demander avant de coder.
- **Suivi des tâches** (fait / en cours / à faire, retours de test) : Google Sheet https://docs.google.com/spreadsheets/d/1ZQ7ed6jMSuXB2pI1psw6YyuFUwAb45k_82fLGVD1m8g
- **Business** (hébergement, prix, marque) : `docs/lancement.md`.

## Structure du monorepo

```
apps/mobile/   React Native + Expo + TypeScript (Expo Router)
apps/api/      Node.js + Express 5 + TypeScript — API REST
docs/          Analyses fonctionnelles (af-vN.md), lancement
```

## Stack

- **Auth** : Firebase Authentication (email, Google). Le mobile envoie le Firebase ID Token en `Authorization: Bearer`.
- **API** : Express 5 + TypeScript, `pg` (SQL écrit à la main, pas d'ORM), Zod. Tokens vérifiés avec `jose` (JWKS Google). Pas de Firebase Admin SDK.
- **BDD** : PostgreSQL, migrations SQL `node-pg-migrate` (`apps/api/migrations/`) uniquement. Colonnes `snake_case`, JSON `camelCase`.
- **Mobile** : TanStack Query, Zustand, React Hook Form + Zod.
- **Hébergement** : API sur Render (Docker, migrations au démarrage), Postgres Neon, builds EAS (`preview` = APK, `production` = AAB).

## Commandes

```bash
# Mobile
cd apps/mobile && yarn expo start
cd apps/mobile && eas build --profile preview --platform android

# API
cd apps/api && yarn dev            # API en local (hot reload)
cd apps/api && yarn migrate:up     # appliquer les migrations
cd apps/api && yarn migrate:create <nom>
cd apps/api && yarn test           # tests d'intégration (Postgres du docker compose)
cd apps/api && yarn verify         # typecheck + lint + format
cd apps/api && yarn seed [--shop "Nom"]        # données de test
cd apps/api && yarn seed:clear [--shop "Nom"]  # vide la boutique

# BDD locale
docker compose up -d postgres
```

## Règles techniques non négociables

- **Montants** : entiers en Ariary (`BIGINT` / `number` entier). Jamais de `float`.
- **Multi-tenant** : toute entité porte un `shopId`. Routes métier sous `/api/v1/shops/:shopId/...` via `requireShop` (404 si l'utilisateur n'y a pas accès). Le `shopId` vient uniquement de `currentShopId(req)`, jamais du body ou de la query. FK composites `(id, shop_id)` entre tables.
- **Stock** : jamais modifié directement ; tout passe par `applyStockMovement` dans la même transaction (décrément atomique `... WHERE stock >= :q`).
- **Commandes** : les lignes figent prix de vente et prix d'achat ; les calculs historiques n'utilisent jamais le prix actuel.
- **Fuseau** : `Indian/Antananarivo` pour tout « aujourd'hui / période ».
- **Produits** : archivage, jamais de suppression.
- **Droits** (v2) : vérifiés côté API sur chaque route ; le mobile ne fait que masquer.

## Décisions techniques

- Schémas de création **stricts** : un champ inconnu renvoie 400.
- Erreurs au format RFC 7807 ; contraintes BDD traduites en 409 / 422.
- Numéro de commande par boutique (`shops.last_order_number` sous verrou de ligne), non affiché pour l'instant.
- Photos : compressées côté mobile (1024 px, JPEG 0,7), envoyées par l'**API REST** de Firebase Storage (le SDK JS échoue sur Android).
- Polices Inter **intégrées au build** (`expo-font`) : sinon textes coupés sur Android.
- APK : architectures `arm64-v8a` + `armeabi-v7a`, R8 activé.
- L'API ne doit jamais casser les anciennes versions de l'app encore installées.

## Conventions

- Code, variables, commits et API en **anglais** ; textes de l'interface en **français**.
- Commits : Conventional Commits (`feat(mobile): ...`, `fix(api): ...`), citer l'ID de tâche quand il existe (`FC-012`).
- API REST : `/api/v1/...`, ressources au pluriel, organisée par domaine (`shop`, `category`, `product`, `customer`, `order`, `stock`, `expense`, `dashboard`).
- Mobile : mobile-first, utilisable à une main ; valeurs de design uniquement depuis `theme` (pas de couleurs ni de tailles en dur).
- Versions : `version` de `app.json` à la main (1.0.x corrections, 1.x.0 fonctionnalités) + tag Git `vX.Y.Z` ; numéro de build Android incrémenté par EAS.
- Garder simple : pas d'abstraction « pour plus tard » sans besoin réel.
