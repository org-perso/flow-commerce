# Flow.Co — version web

Version web professionnelle de **Flow.Co**, l’app de gestion des vendeurs en ligne à Madagascar : commandes, livraisons,
stock, clients, dépenses et équipe. Elle est pensée pour le **propriétaire, le gérant et le community manager sur
ordinateur** ; les livreurs utilisent l’application mobile.

Le site appelle **la même API REST** que l’application mobile (Expo), avec le token Firebase de l’utilisateur. Il n’a ni
route API Next, ni base de données. Les hypothèses faites sur l’API sont listées dans [`API-ASSUMPTIONS.md`](./API-ASSUMPTIONS.md).

## Stack

- Next.js 16 (App Router, TypeScript strict, dossier `src/`), rendu côté client pour la partie connectée
- Tailwind CSS 4 + composants shadcn/ui (Radix), icônes lucide-react, police Inter (`next/font/local`)
- TanStack Query (données serveur), React Hook Form + Zod (formulaires)
- Firebase JS SDK pour l’authentification (email/mot de passe et Google en popup)

## Installation

Prérequis : Node.js 20.9 ou plus récent.

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs (les mêmes que l’app mobile)
npm run dev                  # http://localhost:8000
```

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de l’API, **sans** `/api/v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `NEXT_PUBLIC_FIREBASE_APP_ID` | Config de l’app web Firebase (console Firebase › Paramètres du projet › Vos applications) |

Sans ces variables, le site affiche la liste de celles qui manquent au lieu d’une erreur.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run format` | Prettier |

## Déploiement sur Vercel

1. Importer le dépôt dans Vercel (framework détecté : Next.js, aucune option à changer).
2. Ajouter les 7 variables `NEXT_PUBLIC_*` dans *Settings › Environment Variables* (Production et Preview), puis redéployer :
   elles sont intégrées au moment du build.
3. **Firebase Authentication** › *Settings* › *Authorized domains* : ajouter le domaine Vercel (ex. `flowco-web.vercel.app`)
   pour que la connexion Google en popup fonctionne.
4. **API** : autoriser le domaine Vercel dans le CORS de l’API (voir `API-ASSUMPTIONS.md`, point 1).
5. **Firebase Storage** (photos produits) : autoriser le domaine web dans le CORS du bucket, par exemple avec
   `gsutil cors set cors.json gs://<bucket>` et un `cors.json` contenant
   `[{"origin":["https://flowco-web.vercel.app","http://localhost:8000"],"method":["GET","POST","DELETE"],"responseHeader":["Content-Type","Authorization"],"maxAgeSeconds":3600}]`.

## Organisation du code

```
src/
  app/                    Routes (App Router)
    (auth)/               connexion, inscription, mot-de-passe-oublie
    bienvenue/            sans boutique : créer ou rejoindre avec un code
    s/[shopId]/           boutique active dans l’URL : tableau de bord, commandes, livraisons,
                          stock, clients, depenses, equipe, parametres
  components/
    ui/                   composants shadcn/ui (Radix)
    app/                  coque (menu latéral, barre du haut), états vides/erreurs, pagination…
  features/<domaine>/     types et appels API (repris du mobile), hooks TanStack Query, formulaires
  lib/                    client API, Firebase, formats (Ariary, dates Madagascar), photos
```

## Règles reprises du mobile

- Rôles et permissions de `roles.ts` : le web **masque** menus, boutons et colonnes ; l’API vérifie tout. Le CM ne voit
  jamais les coûts (colonnes prix d’achat et marge absentes), le livreur voit un message et ses livraisons en lecture seule.
- Statuts et transitions de `order-status.ts` ; « Annuler » et « Retour » demandent confirmation.
- Montants entiers en Ariary (`12 500 Ar`), dates et « aujourd’hui » dans le fuseau `Indian/Antananarivo`.
- Le stock ne change que par les commandes et les mouvements (Entrée, Sortie, Inventaire).
- Téléphone obligatoire pour livrer (celui du client, sinon celui de la livraison).
- Photos compressées dans le navigateur (1024 px, JPEG 0,7) puis envoyées à Firebase Storage comme sur le mobile.

## Raccourcis clavier

`N` nouvelle commande · `/` rechercher une commande · `G` puis `D` `C` `L` `S` `K` `E` `Q` `P` pour changer de section ·
`?` aide · `Ctrl`/`⌘` + `Entrée` valider le formulaire de commande · `A` ajouter une dépense (page Dépenses).
