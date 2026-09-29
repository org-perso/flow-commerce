# CLAUDE.md — FlowCommerce

App mobile SaaS de gestion pour vendeurs en ligne (Facebook, Instagram, WhatsApp), marché initial : Madagascar.
Promesse : « De la commande au bénéfice, directement depuis votre téléphone. »

## Structure du monorepo

```
apps/mobile/   React Native + Expo + TypeScript (Expo Router)
apps/api/      Spring Boot (Java) — API REST
apps/admin/    Next.js — plus tard, ne pas créer pour l'instant
docs/          Fiche projet, modèle de données, décisions (ADR)
```

## Stack

- **Auth** : Firebase Authentication (email, Google). Le mobile envoie le Firebase ID Token en `Authorization: Bearer`.
- **API** : Spring Boot, Spring Security en OAuth2 Resource Server (issuer `https://securetoken.google.com/<projectId>`). Pas de Firebase Admin SDK pour vérifier les tokens.
- **BDD** : PostgreSQL, migrations Flyway uniquement (jamais `ddl-auto=update`).
- **Mobile** : TanStack Query (appels API + cache), Zustand (état local), React Hook Form + Zod (formulaires).
- **Notifications** : Firebase Cloud Messaging. **Images** : Firebase Storage, compressées côté client avant upload.

## Commandes

```bash
# Mobile
cd apps/mobile && npx expo start

# API
cd apps/api && ./mvnw spring-boot:run
cd apps/api && ./mvnw test

# BDD locale
docker compose up -d postgres
```

## Règles métier non négociables

- **Montants** : entiers en Ariary (`BIGINT` en BDD, `long` en Java, `number` entier en TS). Jamais de `double`/`float`.
- **Multi-tenant** : toute entité métier porte un `shopId`. Chaque requête filtre par la boutique de l'utilisateur authentifié. Ne jamais faire confiance à un `shopId` envoyé par le client.
- **Stock** : ne jamais modifier `stockQuantity` directement. Tout changement passe par un `StockMovement` dans la même transaction. Décrémentation atomique : `UPDATE ... SET stock = stock - :q WHERE id = :id AND stock >= :q`.
- **Commandes** : `OrderItem` fige `unitSellingPrice` et `unitPurchasePrice` au moment de la commande. Les calculs historiques utilisent ces valeurs, jamais le prix actuel du produit.
- **Annulation / retour** : recréer le mouvement de stock inverse.
- **Marge** = (prix de vente − prix d'achat) × quantité.
- **Bénéfice estimé** = CA − coût des produits vendus − dépenses.
- **Fuseau horaire** : `Indian/Antananarivo` pour tout calcul « aujourd'hui / semaine / mois ».
- **Produits** : archivage (soft delete), pas de suppression physique.

## Décisions en attente (demander avant d'implémenter)

- Moment exact de la décrémentation du stock : création ou confirmation de la commande ?
- Les frais de livraison entrent-ils dans le CA ?
- La dépense « Achat de produits » fait doublon avec le coût des produits vendus : l'exclure du calcul du bénéfice ?

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
