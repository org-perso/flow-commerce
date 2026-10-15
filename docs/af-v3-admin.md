# AF v3 — Espace admin de la plateforme

> Suite de `af-v1.md` et `af-v2.md` : leurs fonctionnalités et règles restent valables.
> Brouillon : les points marqués `[à décider]` sont à trancher avant de coder.

## 1. Objectif et périmètre

Donner à l'équipe Flow.Co un espace pour **suivre la plateforme**, **gérer les boutiques et les utilisateurs** et, plus tard, **gérer les abonnements**.

- **Inclus** : tableau de bord, boutiques (consultation et actions), utilisateurs, abonnements (préparés, **non branchés**).
- **Où** : app web uniquement (`apps/web`, sous `/admin`, plus tard `admin.flow-commerce.com`). Rien sur mobile.
- **Confidentialité** : l'admin voit l'**usage** des boutiques (compteurs, dates), **jamais leurs données métier** (clients, téléphones, produits, prix, détail des commandes).

## 2. Acteurs

| Rôle | Description |
|---|---|
| **Admin plateforme** | Membre de l'équipe Flow.Co. Accès à tout l'espace admin. Rôle **séparé** des rôles de boutique (Propriétaire, Gérant, CM, Livreur) : être admin ne donne aucun accès aux boutiques elles-mêmes. |
| **Vendeur** (tout utilisateur) | Subit les actions admin (suspension, avertissement) et en est informé dans l'app. |

## 3. Fonctionnalités

### F-20 Tableau de bord plateforme
- **Utilisateurs** : total, inscrits aujourd'hui / 7 jours / 30 jours.
- **Boutiques** : total, **actives** (au moins une commande créée sur les 7 derniers jours), nouvelles sur la période.
- **Activité** : commandes créées sur la plateforme par jour (graphique 30 jours).
- **Alertes** : boutiques signalées, comptes suspendus, demandes de suppression de compte en cours.
- **Abonnements** (affiché quand F-24 sera branché) : nombre de payants par formule, revenu du mois.

### F-21 Boutiques — liste et fiche
- **Liste** avec recherche (nom de boutique, email du propriétaire) et filtres : état (active, suspendue, signalée), inactive depuis X jours, formule.
- Colonnes : nom, propriétaire(s), date de création, nombre de membres, commandes (total et 30 derniers jours), dernière activité, état, formule.
- **Fiche boutique** :
  - informations : nom, date de création, propriétaires et contact ;
  - membres et rôles ;
  - usage : commandes par mois, nombre de produits et de clients (**compteurs uniquement**) ;
  - historique des actions admin sur la boutique (F-22) ;
  - abonnement (F-24, quand branché).

### F-22 Boutiques — actions admin
- **Avertir** : envoyer un message au(x) propriétaire(s), affiché dans l'app (bandeau) et par notification. Ex. : contenu interdit, impayé, non-respect des conditions.
- **Signaler** : marquer la boutique comme « à surveiller », avec un motif et une note interne. Non visible du vendeur. Sert de liste de suivi.
- **Suspendre** : la boutique passe en **lecture seule** pour tous ses membres (consultation possible, plus de création ni de modification), avec un bandeau expliquant le motif et le contact support.
- **Réactiver** : lève la suspension.
- **Note interne** : commentaire libre sur la boutique, visible des seuls admins.
- Chaque action demande un **motif** (liste + texte libre) et une confirmation.

Motifs proposés : contenu ou produits interdits, fraude ou arnaque signalée, impayé, demande du propriétaire, autre.

### F-23 Utilisateurs
- **Liste** avec recherche (email, nom) : boutiques et rôles, date d'inscription, dernière connexion, état.
- **Fiche utilisateur** : informations du compte, boutiques et rôles, historique des actions admin.
- **Actions** :
  - **Suspendre le compte** : l'utilisateur ne peut plus se connecter à l'API (message « Compte suspendu, contactez le support »). Ses boutiques ne sont pas suspendues pour autant ; les autres membres continuent à travailler.
  - **Réactiver** le compte.
- **Demandes de suppression** : liste des comptes supprimés par leurs utilisateurs, avec la date d'effacement définitif prévue.

### F-24 Abonnements (préparé, non branché)
> À construire côté admin et API, mais **non activé** tant que l'app (web et mobile) ne propose pas de payer. Tant que ce n'est pas branché, toutes les boutiques sont en **Gratuit sans limite**.

- **Formules** (`docs/lancement.md`) : Gratuit, Pro, Business. Limites `[à décider]` : commandes par mois, nombre de membres, nombre de boutiques.
- **Paiements à valider** : le vendeur paie par Mobile Money (MVola, Orange Money, Airtel Money) et saisit la référence de transaction dans l'app ; l'admin voit montant, opérateur, référence, boutique, et **valide** ou **refuse** (avec motif).
- **Validation** : la boutique passe à la formule payée jusqu'à une **date de fin** (ex. +30 jours).
- **Actions manuelles** : prolonger, offrir une période, changer de formule (bêta-testeurs, partenaires).
- **Suivi** : abonnements qui expirent dans 7 jours, boutiques expirées.

## 4. Droits

| Action | Admin plateforme | Membres de boutique |
|---|---|---|
| Accéder à `/admin` | Oui | Non (404) |
| Voir compteurs et membres d'une boutique | Oui | — |
| Voir les données métier d'une boutique (clients, prix, commandes) | **Non** | Selon leur rôle (v2) |
| Avertir, signaler, suspendre, réactiver une boutique | Oui | Non |
| Suspendre, réactiver un compte | Oui | Non |
| Valider un paiement, changer de formule | Oui (quand F-24 branché) | Non |

## 5. Règles de gestion

- **RG-70** Les admins plateforme sont listés **côté serveur** (table dédiée) ; l'accès est vérifié par l'API sur chaque route `/api/v1/admin/...`. Un non-admin reçoit **404**, pour ne pas révéler l'existence de l'espace.
- **RG-71** Aucune route admin ne renvoie de données métier d'une boutique (clients, téléphones, adresses, produits, prix, détail des commandes) : uniquement des **compteurs et dates**.
- **RG-72** Chaque action admin (avertir, signaler, suspendre, réactiver, valider un paiement, changer de formule) est **enregistrée** : admin, date, cible, motif. Ce journal n'est ni modifiable ni supprimable.
- **RG-73** Une boutique **suspendue** est en lecture seule : l'API refuse toute création ou modification (**403** avec un message explicite), pour tous ses membres. Les données ne sont jamais supprimées par une suspension.
- **RG-74** Un compte **suspendu** est refusé par l'API à chaque requête (**403** « Compte suspendu »). S'il est le **seul propriétaire** d'une boutique, la boutique reste accessible aux autres membres.
- **RG-75** Un admin ne peut pas suspendre son propre compte ni retirer le dernier admin.
- **RG-76** Un **signalement** n'a aucun effet pour le vendeur : il n'est visible que des admins.
- **RG-77** Un **avertissement** est affiché au(x) propriétaire(s) jusqu'à ce qu'ils le marquent comme lu.
- **RG-78** Compatibilité : les anciennes versions de l'app doivent afficher proprement un refus 403 (message du serveur), sans planter.
- **RG-79** (F-24) Une boutique sans abonnement payé valide est en **Gratuit**. Une référence de paiement ne peut être validée qu'**une seule fois**.

## 6. Hors périmètre v3

Paiement automatique par API Mobile Money, factures PDF, voir une boutique « comme le propriétaire » (support), annonces à tous les utilisateurs, limites de formules modifiables sans redéploiement, plusieurs niveaux d'admin (lecture seule, support, super-admin).

## 7. Points à décider

- `[à décider]` Limites de la formule Gratuite et comportement au-delà (blocage ou simple bandeau).
- `[à décider]` Durée de la période de lancement gratuite (la landing dit « Gratuit pendant le lancement »).
- `[à décider]` Le vendeur peut-il contester une suspension depuis l'app, ou seulement par email / WhatsApp ?
- `[à décider]` Une boutique inactive depuis longtemps (ex. 12 mois) est-elle archivée automatiquement ?
