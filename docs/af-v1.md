# AF v1 — FlowCommerce MVP (versions 1.0.x)

> Analyse fonctionnelle de ce que fait l'application aujourd'hui.
> Référence pour le développement et les tests. Toute évolution de règle passe par ce document.
> Suivi des tâches : Google Sheet (onglet Suivi, colonne « Réf. AF »).

## 1. Objectif et périmètre

**Promesse** : « De la commande au bénéfice, directement depuis votre téléphone. »

Application mobile (Android d'abord) pour les vendeurs en ligne de Madagascar (Facebook, Instagram, WhatsApp, TikTok…) qui gèrent leurs commandes, leur stock, leurs clients et leurs dépenses, et voient leur bénéfice.

Objectif d'usage : **créer une commande en 20 à 30 secondes**, à une main, pendant que le client est au téléphone.

**Dans le périmètre v1** : compte, boutiques, produits et stock, clients, commandes (de la prise à la livraison et au paiement), dépenses, tableau de bord.

## 2. Acteurs

| Acteur | Description |
|---|---|
| **Vendeur** | Seul utilisateur en v1. Possède une ou plusieurs boutiques et a tous les droits sur elles. |
| **Client final** | Personne qui commande au vendeur. N'utilise pas l'app ; il est enregistré par le vendeur. |

## 3. Fonctionnalités

### F-01 Compte
- Inscription et connexion par **email / mot de passe** ou **Google**.
- Mot de passe oublié (email de réinitialisation).
- Vérification de l'email **non bloquante** : rappel (pastille sur l'avatar, encadré dans « Compte et boutique »), boutons « J'ai vérifié » / « Renvoyer ».
- Déconnexion (avec confirmation).

### F-02 Boutiques
- Un vendeur peut avoir **plusieurs boutiques** ; il en crée une au premier lancement.
- **Boutique active** affichée dans l'en-tête (initiales sur fond doré + nom ▾) ; un appui permet de changer ou de créer une boutique.
- Modifier le nom et la description de la boutique.
- Chaque boutique a ses propres produits, clients, commandes et dépenses (voir RG-01).

### F-03 Produits et catégories
- Créer / modifier un produit : nom, description, photo (facultative), catégorie, prix d'achat, prix de vente, seuil de stock faible, stock initial.
- Catégories : liste standard à la création de la boutique (Vêtements, Chaussures, Sacs et accessoires, Bijoux, Beauté et cosmétiques, Hygiène, Alimentation, Boissons, Électronique, Maison, Enfants et bébés, Autre) ; le vendeur peut en ajouter.
- Archiver / restaurer un produit (jamais de suppression).
- Liste « Stock » : recherche, filtres **Tous / Stock faible / Rupture / Archivés** avec leur nombre, résumé « N produits · N articles · Valeur ».

### F-04 Stock
- Ajouter, retirer ou ajuster le stock d'un produit, avec un motif.
- **Réapprovisionnement rapide** depuis la liste (− n + puis « Réapprovisionner ») pour les produits en stock faible ou en rupture.
- Historique des mouvements par produit (ajout, retrait, ajustement, vente, retour).

### F-05 Clients
- Créer / modifier un client : nom, **un ou plusieurs numéros** (le premier est le principal), profil réseau (nom Facebook, lien, @compte).
- Fiche client : appeler, WhatsApp, nouvelle commande préremplie, historique de ses commandes.
- Liste : recherche (nom, numéro, profil), nombre de commandes, total dépensé, jour de la dernière commande.
- Bandeau « N commandes sans fiche client » quand des commandes ont été prises sans client.
- Suppression possible seulement si le client n'a aucune commande.

### F-06 Créer une commande
Écran en 4 étapes, accessible depuis le « + » doré de la barre d'onglets :
1. **Client** : rechercher un client existant, en saisir un nouveau (nom + téléphone), ou laisser « client de passage ».
2. **Produits** : rechercher et ajouter des produits, quantités (− n +), alerte si la quantité dépasse le stock ou prend le dernier article.
3. **Remise et date** : Retrait (en main propre) ou Livraison (lieu, adresse, précisions, frais) ; date prévue (aujourd'hui, demain ou autre date).
4. **Paiement** : à encaisser ou déjà payée ; moyen de paiement (Espèces, MVola, Orange Money, Airtel Money).
- Options repliées : **source** de la commande (Facebook, Messenger, Instagram, WhatsApp, TikTok, Appel, Boutique, Autre) et « Commande confirmée » (retire le stock tout de suite).
- Pied d'écran : nombre d'articles, statut de paiement, **bénéfice de la commande**, total à payer, bouton « Créer la commande ».

### F-07 Suivre les commandes
- Liste avec **date** (Aujourd'hui / À venir / Toutes les dates), **recherche** (client, téléphone, produit) et **filtres de statut** avec leur nombre.
- Sections : **En retard**, puis par jour prévu ; **Terminées** repliée en bas (livrées et payées, annulées, retours).
- Carte compacte : client, total, lieu de livraison (ou Retrait), statut, paiement, bouton 📞. Sur les commandes en retard : boutons « étape suivante » et « Encaisser ».
- Fiche commande : résumé (total, source, statut, paiement, date de création), actions (étape suivante, Encaisser, Changer le statut), client (appeler, WhatsApp), remise et date (changer la date), produits et total.
- Marquer payée / non payée.

### F-08 Dépenses
- Saisir une dépense : catégorie (Achat de produits, Publicité, Livraison, Emballage, Transport, Autre), montant, description, date.
- Liste des dépenses du mois avec total ; accessible depuis « Compte et boutique ».

### F-09 Tableau de bord (Accueil)
- Période : **Aujourd'hui / 7 jours / 30 jours**.
- Carte principale : chiffre d'affaires, bénéfice estimé, nombre de ventes et taux de marge.
- Compteurs par statut (En attente, Confirmée, En livraison, Livrée) qui ouvrent la liste filtrée.
- **À traiter** : commandes en retard, montant à encaisser, produits en stock faible.
- Détail du bénéfice (CA − coût des produits − dépenses).
- Boutique vide : guide « Pour bien démarrer » (ajouter des produits, créer une commande, saisir une dépense).

## 4. Règles de gestion

### Général
- **RG-01 Boutiques séparées** : un vendeur ne voit et ne modifie que les données de ses propres boutiques ; aucune donnée ne passe d'une boutique à une autre.
- **RG-02 Montants** : en Ariary, nombres entiers (pas de centimes).
- **RG-03 Fuseau horaire** : « aujourd'hui », « 7 jours », « 30 jours » et les dates prévues sont calculés à l'heure de Madagascar.

### Stock
- **RG-10** Le stock ne change jamais directement : chaque changement est un **mouvement** (ajout, retrait, ajustement, vente, retour) enregistré dans l'historique.
- **RG-11** Le stock ne peut pas devenir négatif : une opération qui le ferait passer sous zéro est refusée.
- **RG-12** Un produit est en **stock faible** quand son stock est inférieur ou égal à son seuil (0 par défaut), en **rupture** à 0.
- **RG-13** Un produit n'est jamais supprimé, seulement archivé ; un produit archivé ne peut plus être commandé.

### Commandes
- **RG-20 Statuts et passages autorisés** :

  | De | Vers |
  |---|---|
  | En attente | Confirmée, Annulée |
  | Confirmée | En préparation, En livraison, Livrée, Annulée |
  | En préparation | En livraison, Livrée, Annulée |
  | En livraison | Livrée, Annulée, Retour |
  | Livrée | Retour |
  | Annulée, Retour | (définitifs) |

- **RG-21 Stock retiré à la confirmation**, pas à la création : une commande en attente ne bloque pas de stock.
- **RG-22** Annuler ou enregistrer un retour sur une commande confirmée (ou plus loin) **remet le stock**. Ces deux actions demandent une confirmation.
- **RG-23 Prix figés** : le prix de vente et le prix d'achat de chaque ligne sont figés à la création ; changer le prix d'un produit ne modifie pas les anciennes commandes.
- **RG-24** Les lignes d'une commande ne sont modifiables que tant qu'elle est en attente.
- **RG-25 Total à payer** = somme des lignes + frais de livraison. Sans livraison (retrait), pas de frais.
- **RG-26 Client saisi dans la commande** : si le numéro existe déjà dans la boutique, la fiche existante est réutilisée (sans être modifiée) ; sinon un client est créé.
- **RG-27 Date prévue** : aujourd'hui par défaut. Une commande est **en retard** si sa date prévue est passée et qu'elle n'est ni livrée, ni annulée, ni retournée.
- **RG-28 Paiement** : indépendant du statut. Une commande peut être payée avant livraison (MVola) ou à la livraison (espèces). La date du premier paiement est conservée.
- **RG-29 Terminée** : livrée **et** payée, annulée, ou retournée. Une commande livrée mais non payée reste « à encaisser ».

### Clients
- **RG-30** Les numéros sont normalisés (+261 34… → 034…) et **uniques dans une boutique** : un numéro identifie un client.
- **RG-31** Statistiques client (nombre de commandes, total dépensé) : commandes hors annulées et retournées.

### Chiffres
- **RG-40 Chiffre d'affaires** = somme des lignes des commandes **vendues** (confirmée → livrée) créées sur la période. Les frais de livraison ne comptent pas.
- **RG-41 Coût des produits vendus** = quantité × prix d'achat figé.
- **RG-42 Bénéfice estimé** = CA − coût des produits vendus − dépenses de la période, **hors « Achat de produits »** (déjà compté dans le coût des produits).
- **RG-43 Taux de marge** = (CA − coût des produits) / CA.
- **RG-44 À encaisser** = total des commandes non payées, hors annulées et retournées.
- **RG-45 Valeur du stock** affichée = stock × prix de vente.

## 5. Hors périmètre v1
Équipe et rôles, mode hors ligne, notifications, paiement en ligne dans l'app, intégration directe des réseaux sociaux, module de livreurs, multi-devise, IA. Voir `af-v2.md` pour la suite.
