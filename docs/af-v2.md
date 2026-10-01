# AF v2 — Équipe, rôles et hors ligne (versions 1.1 à 1.2)

> Suite de `af-v1.md` : toutes les fonctionnalités et règles de la v1 restent valables,
> sauf quand une règle ci-dessous les précise.

## 1. Objectif et périmètre

- **1.1.0 — Hors ligne (niveau A)** : l'app s'ouvre instantanément et reste consultable sans réseau.
- **1.2.0 — Équipe et rôles** : le propriétaire travaille avec un gérant, des community managers et des livreurs, chacun avec ses droits ; notifications de livraison.
- **Plus tard — Hors ligne (niveau B)** : créer et modifier des commandes sans réseau, synchronisées au retour de la connexion.

## 2. Acteurs

| Rôle | Description |
|---|---|
| **Propriétaire** | Crée la boutique. Tous les droits, dont toute l'équipe et les paramètres. Au moins un par boutique. |
| **Gérant** | Gère l'activité au quotidien à la place du propriétaire, et gère les **community managers**. Ne gère ni les autres rôles ni les paramètres de la boutique. |
| **Community Manager (CM)** | Répond aux clients sur les réseaux et prend les commandes. Ne voit pas les chiffres. |
| **Livreur** | Livre les commandes et encaisse. Ne voit que ses livraisons et celles qui restent à prendre. |

Un même compte peut être membre de **plusieurs boutiques**, avec un rôle différent dans chacune (ex. livreur indépendant). Le sélecteur de boutique de l'en-tête affiche toutes ses boutiques.

## 3. Fonctionnalités

### F-10 Inviter et gérer l'équipe (Propriétaire, Gérant)
- Écran « Équipe » (depuis « Compte et boutique ») : liste des membres (nom, email, rôle).
- **Inviter** : choisir un rôle → l'app génère un **code de 6 caractères valable 7 jours**, à partager (WhatsApp, SMS…).
- Voir et annuler les codes en cours.
- Changer le rôle d'un membre ; retirer un membre.
- Le **propriétaire** gère tous les rôles ; le **gérant** ne peut inviter, retirer ou voir les codes que pour des **CM** (RG-58).

### F-11 Rejoindre une boutique
- Toute personne connectée peut saisir un code (« Rejoindre une boutique ») : elle devient membre avec le rôle du code.
- Au premier lancement, un nouvel utilisateur peut **créer sa boutique ou rejoindre une boutique** avec un code.
- Un membre peut **quitter** une boutique.

### F-12 Assigner les livraisons
- Sur une commande avec livraison, le propriétaire, le gérant ou le CM **choisit le livreur** (ou le retire).
- Le livreur peut **prendre pour lui** une livraison non assignée.

### F-13 Espace livreur
- Le livreur arrive sur **« Mes livraisons »** (aujourd'hui, en retard, à venir) et **« À prendre »** (livraisons non assignées).
- Sur ses commandes : voir le client (nom, téléphone, lieu, adresse, précisions), appeler, WhatsApp, **marquer livrée**, **encaisser**.

### F-14 Navigation selon le rôle
- Les onglets, boutons et chiffres que le rôle ne peut pas utiliser sont **masqués**, pas seulement bloqués.

### F-15 Hors ligne — niveau A (1.1.0)
- Les dernières données consultées (commandes, produits, clients, accueil) sont **gardées sur le téléphone** : l'app s'affiche tout de suite, puis se met à jour.
- Au lancement, l'app réveille le serveur en arrière-plan.
- Sans réseau : bandeau **« Hors ligne · mis à jour à 14 h 05 »** ; les actions (créer, modifier) sont désactivées avec un message clair.

### F-16 Hors ligne — niveau B (plus tard)
- Créer une commande, changer un statut, encaisser, réapprovisionner **sans réseau** : l'action s'affiche tout de suite et part dès le retour de la connexion.
- En cas de conflit (stock vendu entre-temps par un autre membre), la commande est signalée à corriger.

### F-17 Notifications de livraison (1.2.0)
Notifications push sur le téléphone ; un appui ouvre la commande concernée.
- **Livreur** : une livraison lui est **assignée** ; une **nouvelle livraison est à prendre** dans une de ses boutiques.
- **Propriétaire et gérant** : un livreur a **marqué une commande livrée** ou l'a **encaissée**.
- Chaque utilisateur peut désactiver les notifications depuis les réglages du téléphone.

## 4. Droits par rôle

| Action | Propriétaire | Gérant | CM | Livreur |
|---|:-:|:-:|:-:|:-:|
| Créer / modifier une commande | ✅ | ✅ | ✅ | ❌ |
| Voir les commandes | toutes | toutes | toutes | les siennes + à prendre |
| Changer le statut d'une commande | ✅ | ✅ | ✅ | livrée, sur les siennes |
| Encaisser | ✅ | ✅ | ✅ | sur les siennes |
| Assigner un livreur | ✅ | ✅ | ✅ | se l'assigner (non assignées) |
| Clients : voir / créer / modifier | ✅ | ✅ | ✅ | nom, téléphone, adresse de ses livraisons |
| Stock : voir | ✅ | ✅ | ✅ | ❌ |
| Produits et stock : modifier | ✅ | ✅ | ❌ | ❌ |
| Dépenses | ✅ | ✅ | ❌ | ❌ |
| Tableau de bord (CA, bénéfice) | ✅ | ✅ | ❌ | ❌ |
| Paramètres de la boutique | ✅ | ❌ | ❌ | ❌ |
| Équipe : voir les membres | ✅ | ✅ | ❌ | ❌ |
| Équipe : inviter, retirer, changer de rôle | tous les rôles | CM seulement | ❌ | ❌ |

## 5. Règles de gestion

- **RG-50** Chaque boutique a **au moins un propriétaire** : on ne peut ni retirer ni rétrograder le dernier.
- **RG-51** Les droits sont vérifiés **par le serveur** à chaque action, pas seulement par l'app.
- **RG-52** Un code d'invitation est **à usage unique**, expire après **7 jours**, et ne peut pas donner le rôle Propriétaire.
- **RG-53** Une personne déjà membre ne peut pas rejoindre une seconde fois la même boutique (le code est refusé).
- **RG-54** Seule une commande **avec livraison** peut être assignée à un livreur ; le livreur doit être membre de la boutique avec le rôle Livreur.
- **RG-55** Un livreur ne peut prendre qu'une livraison **non assignée et encore ouverte** ; si deux livreurs la prennent en même temps, seul le premier l'obtient.
- **RG-56** Un membre retiré perd immédiatement l'accès à la boutique ; ses livraisons en cours redeviennent non assignées.
- **RG-57** Les données créées par un membre (commandes, clients…) restent dans la boutique après son départ.
- **RG-58** Le **propriétaire** peut inviter, retirer et changer le rôle de tous les membres. Le **gérant** ne peut agir que sur les **CM** : inviter un CM, retirer un CM ; il ne peut pas donner un autre rôle ni modifier un propriétaire, un gérant ou un livreur.
- **RG-59** Une notification n'est envoyée qu'aux membres **actuels** de la boutique, et un livreur n'est jamais notifié pour une boutique qu'il a quittée.

## 6. Hors périmètre v2
Abonnements payants (freemium), suivi GPS des livreurs, paiement des livreurs, historique de qui a fait quoi (journal d'activité).
