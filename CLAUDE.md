# CLAUDE.md — FlowCommerce

App mobile SaaS de gestion pour vendeurs en ligne (Facebook, Instagram, WhatsApp), marché initial : Madagascar.
Promesse : « De la commande au bénéfice, directement depuis votre téléphone. »

## Structure du monorepo

```
apps/mobile/   React Native + Expo + TypeScript (Expo Router)
apps/api/      Node.js + Express 5 + TypeScript — API REST
apps/admin/    Next.js — plus tard, ne pas créer pour l'instant
docs/          Fiche projet, modèle de données, décisions (ADR)
```

## Stack

- **Auth** : Firebase Authentication (email, Google). Le mobile envoie le Firebase ID Token en `Authorization: Bearer`.
- **API** : Express 5 + TypeScript, `pg` (SQL écrit à la main, pas d'ORM), Zod pour la validation. Tokens Firebase vérifiés avec `jose` (JWKS Google, issuer `https://securetoken.google.com/<projectId>`). Pas de Firebase Admin SDK.
- **BDD** : PostgreSQL, migrations SQL versionnées avec `node-pg-migrate` (`apps/api/migrations/`) uniquement. Colonnes en `snake_case`, API JSON en `camelCase`.
- **Mobile** : TanStack Query (appels API + cache), Zustand (état local), React Hook Form + Zod (formulaires).
- **Notifications** : Firebase Cloud Messaging. **Images** : Firebase Storage, compressées côté client avant upload.

## Commandes

```bash
# Mobile
cd apps/mobile && yarn expo start

# API
cd apps/api && yarn dev            # API en local (hot reload)
cd apps/api && yarn migrate:up     # appliquer les migrations
cd apps/api && yarn migrate:create <nom>  # nouvelle migration SQL
cd apps/api && yarn test           # tests d'intégration (Postgres du docker compose)
cd apps/api && yarn verify         # typecheck + lint + format

# BDD locale / stack complète
docker compose up -d postgres
docker compose up -d --build       # Postgres + API (migrations au démarrage)
```

## Règles métier non négociables

- **Montants** : entiers en Ariary (`BIGINT` en BDD, `number` entier en TS côté API et mobile). Jamais de `double`/`float`.
- **Multi-tenant** : un utilisateur peut posséder plusieurs boutiques. Toute entité métier porte un `shopId`. Les routes métier sont sous `/api/v1/shops/:shopId/...` et passent par `requireShop`, qui vérifie que la boutique appartient à l'utilisateur (sinon 404). Ne jamais lire un `shopId` depuis le body ou la query : uniquement `currentShop(req)`. En BDD, les références entre tables passent par des FK composites `(id, shop_id)` pour empêcher tout mélange entre boutiques.
- **Stock** : ne jamais modifier `stockQuantity` directement. Tout changement passe par un `StockMovement` dans la même transaction. Décrémentation atomique : `UPDATE ... SET stock = stock - :q WHERE id = :id AND stock >= :q`.
- **Commandes** : `OrderItem` fige `unitSellingPrice` et `unitPurchasePrice` au moment de la commande. Les calculs historiques utilisent ces valeurs, jamais le prix actuel du produit.
- **Annulation / retour** : recréer le mouvement de stock inverse.
- **Marge** = (prix de vente − prix d'achat) × quantité.
- **Bénéfice estimé** = CA − coût des produits vendus − dépenses.
- **Fuseau horaire** : `Indian/Antananarivo` pour tout calcul « aujourd'hui / semaine / mois ».
- **Produits** : archivage (soft delete), pas de suppression physique.

## Décisions prises

- **Stock décrémenté à la confirmation** de la commande (passage à `CONFIRMEE`), pas à la création. Une commande `EN_ATTENTE` ne bloque pas de stock et ses lignes restent modifiables ; une fois confirmée, les lignes sont figées. Statuts « vendus » (qui tiennent du stock) : `CONFIRMEE`, `EN_PREPARATION`, `EN_LIVRAISON`, `LIVREE`. Passer à `ANNULEE` ou `RETOUR` depuis l'un d'eux recrée les mouvements inverses (`RETOUR`). Les changements de statut passent par `POST /orders/:id/status`, qui applique la table `TRANSITIONS`.
- **Frais de livraison hors CA** : CA = somme des sous-totaux des lignes. `totalAmount` (ce que paie le client) = lignes + livraison.
- **« Achat de produits » exclu du bénéfice** : déjà compté via le coût des produits vendus. Bénéfice estimé = CA − coût des produits vendus − dépenses hors `ACHAT_PRODUITS`.
- Le CA et les ventes d'une période se basent sur la date de création de la commande (fuseau `Indian/Antananarivo`).

## Hors périmètre MVP 1 — ne pas implémenter

Composants/nomenclatures, module livraison et livreurs, rôles et équipe, intégrations réseaux sociaux, paiements en ligne, IA/prédictions, multi-devise.

## Conventions

- Code, noms de variables, commits et API en **anglais** ; textes de l'interface en **français**.
- Commits : Conventional Commits (`feat(mobile): ...`, `fix(api): ...`).
- API REST : `/api/v1/...`, ressources au pluriel, erreurs au format RFC 7807 (`ProblemDetail`).
- API organisée par domaine : `shop`, `product`, `customer`, `order`, `stock`, `expense`, `dashboard`.
- Mobile : UX mobile-first, utilisable à une main. Objectif : créer une commande en 20–30 s.
- Garder le MVP simple : pas d'abstraction « pour plus tard » sans besoin réel.

## Référence

Backlog et modèle de données : `docs/`. IDs de tâches au format `FC-XXX`.
