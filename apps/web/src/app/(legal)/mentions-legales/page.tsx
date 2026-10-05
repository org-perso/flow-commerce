import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL, PRIVACY_PATH } from "@/features/legal/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <>
      <h1>Mentions légales</h1>

      <h2>Éditeur</h2>
      <p>
        {LEGAL.product} est édité par <strong>{LEGAL.publisher}</strong>,{" "}
        {LEGAL.legalForm}, {LEGAL.address}.
        <br />
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>

      <h2>Hébergement</h2>
      <ul>
        <li>
          Site web : Vercel Inc., États-Unis (
          <a href="https://vercel.com">vercel.com</a>).
        </li>
        <li>
          Serveur de l’application : Render Services, Inc., États-Unis (
          <a href="https://render.com">render.com</a>).
        </li>
        <li>
          Base de données : Neon, Inc. (
          <a href="https://neon.tech">neon.tech</a>).
        </li>
        <li>
          Connexion et photos : Google Firebase, Google LLC (
          <a href="https://firebase.google.com">firebase.google.com</a>).
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom {LEGAL.product}, le logo, l’application et le site sont la
        propriété de {LEGAL.publisher}. Toute reproduction sans autorisation est
        interdite. Les contenus saisis par les utilisateurs (produits, photos,
        clients…) restent leur propriété.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{" "}
        <Link href={PRIVACY_PATH}>politique de confidentialité</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question :{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </>
  );
}
