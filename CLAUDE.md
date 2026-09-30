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
- **Catégories de produits** : table `product_categories` par boutique (nom unique, insensible à la casse). Chaque nouvelle boutique reçoit la liste standard `DEFAULT_CATEGORIES` ; le vendeur peut en ajouter. Un produit référence une catégorie (`categoryId`), jamais du texte libre.
- **Clients** : plusieurs numéros par client (table `customer_phones`, ordre `position`, le premier est le principal). Numéros normalisés (`+261 34…` → `034…`) et **uniques par boutique** : un numéro identifie un client. Pas d'adresse sur le client ; à la place, un `socialProfile` (nom Facebook, lien, @compte).
- **Commande avec client saisi** : `POST /orders` accepte `customer: { name, phone }` ; si le numéro existe dans la boutique, la fiche existante est réutilisée (sans être modifiée).
- **Livraison par commande** : facultative. `delivery: { place, address, note, fee }` ou `null` (retrait / remise en main propre, pas de frais — garanti par une contrainte BDD). **Source** de la commande : `FACEBOOK`, `MESSENGER`, `INSTAGRAM`, `WHATSAPP`, `TIKTOK`, `APPEL`, `BOUTIQUE`, `AUTRE`.
- **Date prévue** (`scheduledDate`) : jour de livraison ou de remise, par défaut aujourd'hui (Madagascar). La vue « Aujourd'hui » = prévues aujourd'hui + commandes **en retard** encore ouvertes (prévues avant, statut `EN_ATTENTE` → `EN_LIVRAISON`) ; « À venir » = prévues après aujourd'hui (`GET /orders?when=today|upcoming`). Le CA reste basé sur la date de création.
- **Paiement** : `paidAt` (null = non payée), exposé en `isPaid` ; indépendant du statut et du moyen de paiement. `PATCH /orders/:id { isPaid }` (garde la première date de paiement).
- **Numéro de commande** : `number` par boutique (#001…), compteur `shops.last_order_number` incrémenté sous verrou de ligne à la création.
- **Stats client** (`orderCount`, `totalSpent`, `lastOrderAt`) et **« à encaisser »** du dashboard : commandes hors `ANNULEE` / `RETOUR`. Valeur du stock : `stockValue` au prix d'achat, `stockSaleValue` au prix de vente.
- **Images produits** : compressées côté mobile (1024 px, JPEG 0,7), envoyées dans Firebase Storage sous `shops/{shopId}/products/`, l'URL est stockée dans `products.image`.
- Les schémas de création de l'API sont **stricts** : un champ inconnu (ancien contrat) renvoie 400 au lieu d'être ignoré.

## Roadmap

À tenir à jour à chaque livraison (✅ fait · 🚧 en cours · ⏳ à faire).

**MVP 1 — socle**
- ✅ Auth Firebase : email/mot de passe, Google (development build), mot de passe oublié, vérification email non bloquante
- ✅ Boutiques : plusieurs par utilisateur, boutique active, sélecteur dans l'en-tête
- ✅ API Express + Postgres : boutiques, produits, stock, clients, commandes, dépenses, dashboard (tests d'intégration)
- ✅ Mobile branché sur l'API : Stock, Clients, Commandes, Dépenses, Dashboard
- ✅ Design system (tokens de la charte) et composants de base (`ScreenHeader`, `ListRow`, `SegmentedControl`…)

**Itération UX en cours**
- ✅ Stock : photo produit, catégories en liste déroulante (+ ajout), retour à la liste après ajout, bouton Modifier dans l'en-tête
- ✅ Accueil : guide « Pour bien démarrer » pour une boutique vide
- ✅ Clients : plusieurs numéros, profil Facebook/réseau, plus d'adresse ; fiche avec Appeler / WhatsApp / Nouvelle commande
- ✅ Commandes : source, livraison facultative (lieu, adresse, précisions, frais), client prérempli depuis sa fiche
- ✅ Commandes : date prévue ; liste « Aujourd'hui / À venir / Toutes » (retards en tête, regroupement par jour), statut en liste déroulante ; fiche : changer la date, étape suivante + « Changer le statut »
- ✅ Commandes : statut payée / non payée (création, fiche, liste) ; carte de liste = client + numéro, statut, produits sans prix, lieu de livraison, date, paiement, total
- ✅ En-tête des onglets : bandeau bleu marine (logo à initiales + boutique ▾, recherche, avatar du compte avec pastille si email non vérifié) ; titre de l'onglet dans le contenu (`PageTitle`)
- ✅ Onglets : Accueil · Commandes · « + » doré (nouvelle commande) · Stock · Clients ; l'onglet Plus devient l'écran « Compte et boutique » (`/account`)
- 🚧 Refonte UX (spec du 29/09) : étapes 0–4 faites ; restent Commandes (étape 5) et Accueil (étape 6)
- ✅ API refonte UI (30/09) : `orders.number`, `GET /orders?q=`, `GET /orders/counts`, dashboard `7d`/`30d` + `grossMarginRate` + `unpaid` + `overdueOrders`, stats client + `GET /customers/unlinked-orders-count`, `GET /products?outOfStock=` + `GET /products/summary`
- 🚧 Refonte UI (maquettes du 30/09) : ~~1. en-tête + onglets + compte~~ · 2. Commandes · 3. Accueil · 4. Stock · 5. Clients
- ⏳ Modifier les lignes d'une commande en attente (l'API le permet déjà)

**Avant la mise en production**
- ⏳ Déploiement Render (API + Postgres) et variables EAS pour les builds `preview` / `production`
- ⏳ Règles Firebase Storage à durcir, limite de requêtes (rate limiting) sur l'API
- ⏳ Notifications push (FCM) — définir d'abord quand notifier le vendeur
- ⏳ Logo de la boutique (emplacement déjà prévu dans l'en-tête)

## Hors périmètre MVP 1 — ne pas implémenter

Composants/nomenclatures, module livraison et livreurs, rôles et équipe, intégrations réseaux sociaux, paiements en ligne, IA/prédictions, multi-devise.

## Conventions

- Code, noms de variables, commits et API en **anglais** ; textes de l'interface en **français**.
- Commits : Conventional Commits (`feat(mobile): ...`, `fix(api): ...`).
- API REST : `/api/v1/...`, ressources au pluriel, erreurs au format RFC 7807 (`ProblemDetail`).
- API organisée par domaine : `shop`, `category`, `product`, `customer`, `order`, `stock`, `expense`, `dashboard`.
- Mobile : UX mobile-first, utilisable à une main. Objectif : créer une commande en 20–30 s.
- Garder le MVP simple : pas d'abstraction « pour plus tard » sans besoin réel.

## Référence

Backlog et modèle de données : `docs/`. IDs de tâches au format `FC-XXX`.
