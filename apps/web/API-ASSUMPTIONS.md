# Hypothèses sur l’API

Le site appelle la même API REST que l’application mobile (`NEXT_PUBLIC_API_URL` + `/api/v1`), sans la modifier.
Les types et les corps de requêtes viennent des fichiers `*-api.ts` du mobile. Ce fichier liste ce que le mobile ne
précise pas, et ce que le web a donc **supposé**. À vérifier côté API avant la mise en production.

| # | Route / champ | Hypothèse | Où c’est utilisé |
|---|---|---|---|
| 1 | CORS (toutes les routes) | L’API autorise l’origine du site (domaine Vercel et `http://localhost:8000`), l’en-tête `Authorization` et les méthodes `GET, POST, PUT, PATCH, DELETE`. Le mobile n’en a pas besoin, le navigateur si. **Sans ça, aucun appel ne passe.** | `src/lib/api-client.ts` |
| 2 | `GET /health` | Répond sans authentification. Appelé à l’ouverture du site pour réveiller l’API, résultat ignoré. | `wakeUpApi()` |
| 3 | `GET /me` | Le mobile ne l’appelle pas. Réponse supposée : `{ id, email, name, createdAt? }`. `id` est le même identifiant que `Member.userId` (sert à afficher « (vous) » dans l’équipe). | `src/features/me/me-api.ts`, page Équipe |
| 4 | `PATCH /me` | Corps supposé : `{ name: string \| null }` (seul champ modifiable). Réponse : le profil à jour. | Paramètres › Compte |
| 5 | `DELETE /me` | Comme le mobile : renvoie `{ images: string[] }`, les URL Firebase Storage à effacer avant de supprimer le compte Firebase. | Paramètres › Supprimer mon compte |
| 6 | `GET …/orders` et `GET …/orders/counts` : `from`, `to` | **Vérifié** : dates `YYYY-MM-DD` (fuseau `Indian/Antananarivo`), bornes incluses, appliquées à la **date de création** (`createdAt`), pas à la date prévue. Acceptées aussi par `/counts`. Le filtre s'appelle donc « Créées entre ». | Commandes › Créées entre |
| 7 | `GET …/orders/counts` | `total` et `byStatus` respectent les mêmes filtres que la liste (statut exclu). Le web s’en sert comme total de pagination. | Commandes |
| 8 | Listes sans total | `orders`, `products`, `customers`, `stock-movements` renvoient un tableau sans total : la page suivante est proposée tant que la page est pleine (`limit` = 50). | Toutes les tables |
| 9 | `GET …/expenses` : `total` | Comme sur le mobile, `total` est la **somme en Ariary** des dépenses filtrées (pas un nombre de lignes). | Dépenses |
| 10 | `GET …/products` : `archived=true` | Renvoie seulement les produits archivés ; sans ce paramètre, seulement les actifs. Les compteurs des onglets viennent de `GET …/products/summary`. | Stock |
| 11 | Livraisons | Pas de filtre « avec livraison » côté API : le web charge `GET …/orders?when=today` (ou `upcoming`) avec `limit=200`, puis garde côté navigateur les commandes avec `delivery` et un statut ouvert. Au-delà de 200 commandes sur la période, un message renvoie vers la page Commandes. | Livraisons |
| 12 | `GET …/drivers`, `PUT/DELETE …/orders/:id/driver` | Accessibles aux rôles qui ont `orders` (OWNER, MANAGER, CM). Si l’API refuse au CM, le message « Votre rôle ne permet pas cette action. » s’affiche. | Panneau commande, Livraisons |
| 13 | `GET …/customers/unlinked-orders-count` | Route utilisée par le mobile (absente de la liste du cahier des charges) : `{ count }`. | Clients |
| 14 | `DELETE …/customers/:id` | Comme le mobile : `409` quand le client a des commandes (message dédié). | Fiche client |
| 15 | `POST …/products/:id/stock-movements` | Comme le mobile : `quantity` positive pour AJOUT et RETRAIT ; pour AJUSTEMENT, l’écart signé entre la quantité comptée et le stock actuel. `409` + `available` si le stock est insuffisant. | Fiche produit |
| 16 | `POST …/orders` / `PATCH …/orders/:id` | Erreur de stock : `title = "Insufficient Stock"` avec `productId` et `available` (comme le mobile). En modification d’une commande confirmée, `items` n’est pas envoyé. | Formulaire de commande |
| 17 | Doublon de téléphone client | `title = "Duplicate Phone"` avec `customerId` et `phone` (comme le mobile). | Formulaire client |
| 18 | Firebase Storage | Les règles de sécurité acceptent l’envoi depuis le navigateur sur `shops/{shopId}/products/...` avec `Authorization: Firebase <idToken>`, comme depuis le mobile. Le bucket doit autoriser le CORS du domaine web pour l’envoi par `fetch` (voir README). | Photos produit |

Rien d’autre n’a été inventé : les champs envoyés sont exactement ceux des types du mobile.
