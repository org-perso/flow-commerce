# Landing page — contenu proposé

Brouillon du contenu de **flow-commerce.com** (site vitrine). L'app web reste sur **app.flow-commerce.com**.
Les textes entre `[crochets]` sont à compléter ou à valider.

Cible : vendeurs en ligne à Madagascar (Facebook, Instagram, WhatsApp), seuls ou en petite équipe (gérant, CM, livreurs).
Ton : simple, direct, tutoiement ou vouvoiement à choisir (proposé : **vouvoiement**).

---

## Structure de la page

1. En-tête (menu)
2. Hero (accroche + boutons)
3. Le problème
4. Ce que Flow.Co fait
5. Comment ça marche (3 étapes)
6. Pour toute l'équipe (rôles)
7. Mobile et ordinateur
8. Tarifs
9. Questions fréquentes
10. Dernier appel à l'action
11. Pied de page

---

## 1. En-tête

- Logo **Flow.Co**
- Liens : Fonctionnalités · Tarifs · Questions
- Boutons : **Se connecter** (→ app.flow-commerce.com/connexion) · **Télécharger l'app** (→ Play Store)

## 2. Hero

**Titre :** De la commande au bénéfice, directement depuis votre téléphone.

**Sous-titre :** Flow.Co rassemble vos commandes Facebook, Instagram et WhatsApp, votre stock, vos livraisons et vos bénéfices dans une seule app. Fini les cahiers et les captures d'écran.

**Boutons :**
- Télécharger sur Google Play
- Utiliser sur ordinateur (→ app.flow-commerce.com)

**Visuel :** capture du téléphone (accueil avec les 4 compteurs) + capture web de la liste des commandes en arrière-plan.

**Ligne de confiance :** « Conçu à Madagascar, pour les vendeurs malgaches. Montants en Ariary. »

## 3. Le problème

**Titre :** Vendre en ligne, c'est simple. Tout suivre, beaucoup moins.

Trois cartes :
- **Commandes éparpillées** — dans Messenger, WhatsApp, un cahier… et on en oublie.
- **Stock approximatif** — on vend un produit qu'on n'a plus.
- **Bénéfice inconnu** — on encaisse, mais combien reste-t-il vraiment après les achats et les dépenses ?

## 4. Ce que Flow.Co fait

**Titre :** Tout votre commerce, au même endroit.

| Fonction | Texte proposé |
|---|---|
| **Commandes** | Notez une commande en quelques secondes : produits, lieu et heure de livraison, client. Suivez chaque état, de « à confirmer » jusqu'à « payée ». |
| **Stock** | Le stock se met à jour tout seul à chaque commande. Alerte quand un produit manque, correction en un geste. |
| **Livraisons** | Assignez un livreur, il est prévenu sur son téléphone. Il organise sa tournée par moment et par lieu, appelle le client en un clic. |
| **Encaissement** | Sachez qui a payé, qui doit encore payer, et ce que chaque livreur doit vous remettre. |
| **Clients** | Retrouvez l'historique de chaque client et recommandez la même commande en un clic. |
| **Bénéfice** | Chiffre d'affaires, coût d'achat, dépenses et marge réelle, par jour ou par période. |
| **Recap des ventes** | Les quantités vendues par produit, pour savoir quoi racheter. |
| **WhatsApp** | Envoyez au client le récapitulatif de sa commande en un clic. |

Petits plus (liste courte) : couleurs des états personnalisables, filtres enregistrés, actions groupées sur ordinateur, plusieurs boutiques sur un même compte.

## 5. Comment ça marche

1. **Créez votre boutique** — avec votre email ou votre compte Google, en 1 minute.
2. **Ajoutez vos produits** — prix de vente, prix d'achat, stock.
3. **Notez vos commandes** — Flow.Co s'occupe du stock, des livraisons et des calculs.

## 6. Pour toute l'équipe

**Titre :** Chacun voit ce dont il a besoin.

| Rôle | Ce qu'il fait |
|---|---|
| **Propriétaire** | Voit tout : ventes, coûts, bénéfice, équipe. |
| **Gérant** | Gère commandes, stock et livraisons au quotidien. |
| **Community manager** | Note les commandes depuis les messages, sans voir vos coûts ni votre chiffre d'affaires. |
| **Livreur** | Voit ses livraisons, organise sa tournée, marque les commandes livrées et payées. |

Phrase : « Invitez votre équipe en un lien. Vos prix d'achat et vos marges restent privés. »

## 7. Mobile et ordinateur

**Titre :** Sur le téléphone en livraison, sur l'ordinateur au bureau.

- **App Android** : pensée pour être utilisée à une main.
- **Version web** : grand tableau des commandes, filtres, actions groupées.
- Les deux sont synchronisées en temps réel.

## 8. Tarifs

`[À définir — reprendre docs/lancement.md]`

Proposition de présentation :
- **Gratuit** pendant la période de lancement `[durée]`.
- Puis une formule `[prix] Ar / mois`, avec `[limites : nombre de commandes, membres d'équipe…]`.
- Paiement `[MVola / Orange Money / Airtel Money]`.

## 9. Questions fréquentes

- **Est-ce que c'est payant ?** `[selon les tarifs]`
- **Faut-il un ordinateur ?** Non, tout se fait depuis le téléphone. La version web est un plus.
- **Et sur iPhone ?** `[Pas encore / bientôt]` — la version web fonctionne sur tous les appareils.
- **Mes données sont-elles en sécurité ?** Vos données sont hébergées de façon sécurisée et ne sont jamais revendues. Voir la politique de confidentialité.
- **Mon livreur doit-il payer ?** Non, les membres de l'équipe utilisent l'app gratuitement `[à confirmer]`.
- **Puis-je gérer plusieurs boutiques ?** Oui, depuis le même compte.
- **Comment supprimer mon compte ?** Depuis l'app : Compte › Paramètres du compte › Supprimer mon compte.

## 10. Dernier appel à l'action

**Titre :** Prêt à y voir clair dans votre commerce ?

Boutons : Télécharger l'app · Se connecter

## 11. Pied de page

- © `[année]` Glow UP · Flow.Co
- Politique de confidentialité (`/confidentialite`) · Mentions légales (`/mentions-legales`)
- Contact : `[support@flow-commerce.com]` · `[page Facebook]` · `[WhatsApp]`

---

## Technique (rappel)

- Projet séparé `apps/landing` (Next.js statique) sur Vercel, domaine `flow-commerce.com` (+ `www` redirigé).
- Les pages légales déménagent ici ; l'app mobile et le Play Store pointent vers `https://flow-commerce.com/confidentialite`.
- SEO : titre, description, image de partage (Open Graph) pour Facebook/WhatsApp.
- Statistiques de visite (optionnel) uniquement sur la landing.

## Visuels à préparer

- Captures : accueil mobile, nouvelle commande, tournée du livreur, recap des ventes, tableau web.
- Logo en SVG, image de partage 1200×630.
