/**
 * Public URLs, from the environment (see .env.example). The defaults are the production ones,
 * so a missing variable never produces a broken link.
 */

/** This site (flow-commerce.com): used for absolute links such as the Open Graph image. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://flow-commerce.com";

/** The web app (app.flow-commerce.com). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.flow-commerce.com";

export const SIGN_IN_URL = `${APP_URL}/connexion`;
export const SIGN_UP_URL = `${APP_URL}/inscription`;

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.flowcommerce.app";
