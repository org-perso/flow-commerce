import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL, LEGAL_NOTICE_PATH } from "@/features/legal/legal";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <>
      <header className="space-y-1">
        <h1>Politique de confidentialité</h1>
        <p className="text-muted-foreground">
          Dernière mise à jour : {LEGAL.privacyUpdatedAt}
        </p>
      </header>

      <p>
        {LEGAL.product} est une application de gestion pour les vendeurs en
        ligne, éditée par {LEGAL.publisher}, {LEGAL.address}. Contact :{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>
          <strong>Votre compte</strong> : email, nom, et photo de profil si vous
          vous connectez avec Google.
        </li>
        <li>
          <strong>Votre boutique</strong> : produits, photos, stock, commandes,
          dépenses et membres de l’équipe (pseudo et rôle).
        </li>
        <li>
          <strong>Les clients de votre boutique</strong> : nom, téléphone et
          adresse de livraison, que vous saisissez vous-même. Pour ces données,
          vous en êtes responsable et {LEGAL.product} les traite seulement pour
          votre compte.
        </li>
        <li>
          <strong>Technique</strong> : un identifiant de notifications de
          l’appareil, pour vous envoyer les alertes de livraison.
        </li>
      </ul>
      <p>
        Nous ne collectons ni votre position, ni vos contacts, ni de données de
        paiement bancaire.
      </p>

      <h2>Pourquoi</h2>
      <p>
        Uniquement pour faire fonctionner l’application : vous connecter,
        enregistrer vos ventes, calculer vos bénéfices et prévenir votre équipe.{" "}
        <strong>Aucune revente, aucune publicité.</strong>
      </p>

      <h2>Où sont-elles stockées</h2>
      <p>
        Les données sont stockées chez des prestataires reconnus, sur des
        serveurs qui peuvent être situés hors de Madagascar (Union européenne,
        États-Unis) :
      </p>
      <ul>
        <li>Google Firebase pour la connexion et les photos ;</li>
        <li>Neon pour la base de données ;</li>
        <li>Render pour le serveur ;</li>
        <li>Vercel pour le site web.</li>
      </ul>
      <p>Les échanges sont chiffrés (HTTPS).</p>

      <h2>Combien de temps</h2>
      <p>
        Tant que votre compte existe. À la suppression du compte, vos données
        sont effacées sous {LEGAL.erasureDays} jours.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi n° 2014-038 sur la protection des données à
        caractère personnel, vous pouvez accéder à vos données, les corriger ou
        les supprimer :
      </p>
      <ul>
        <li>
          depuis l’application ou le site, dans Paramètres › Supprimer mon
          compte ;
        </li>
        <li>
          ou en écrivant à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </li>
      </ul>

      <h2>Modifications</h2>
      <p>
        En cas de changement important, nous vous préviendrons dans
        l’application.
      </p>

      <p className="text-muted-foreground">
        Voir aussi les <Link href={LEGAL_NOTICE_PATH}>mentions légales</Link>.
      </p>
    </>
  );
}
