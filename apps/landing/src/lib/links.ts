/** The web app (app.flow-commerce.com in production). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.flow-commerce.com";

export const SIGN_IN_URL = `${APP_URL}/connexion`;
export const SIGN_UP_URL = `${APP_URL}/inscription`;

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.flowcommerce.app";
