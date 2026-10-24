import { createHash } from 'node:crypto';

import { env } from '../../config/env.js';
import { ProblemError } from '../../http/problem.js';

// Cloudinary over its REST API (no SDK): signed uploads straight from the apps, and folder
// cleanup when a shop is deleted. Files never transit through this server.

export type UploadKind = 'product' | 'logo';

const FOLDERS: Record<UploadKind, string> = { product: 'products', logo: 'logo' };

/** flowco/shops/<shopId>: every file of a shop, so it can be removed in one call. */
export const shopFolder = (shopId: string) => `${env.CLOUDINARY_FOLDER}/shops/${shopId}`;

function credentials() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey } = env;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ProblemError(503, 'Service Unavailable', 'L’envoi de photos n’est pas configuré.');
  }
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary signature: SHA-1 of the sorted "key=value" pairs followed by the API secret. */
export function sign(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(payload + apiSecret)
    .digest('hex');
}

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Where the app posts the file (multipart form: file, api_key, timestamp, folder, signature). */
  uploadUrl: string;
};

/**
 * Permission to upload ONE kind of file into this shop's folder, valid about an hour (Cloudinary
 * refuses older timestamps). The folder is signed: the app cannot write anywhere else.
 */
export function uploadSignature(shopId: string, kind: UploadKind): UploadSignature {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  // `folder` sets both the Media Library folder and the URL path, in fixed and dynamic modes.
  const folder = `${shopFolder(shopId)}/${FOLDERS[kind]}`;
  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature: sign({ folder, timestamp }, apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

/**
 * Deletes every file of the shop (account deletion). Best effort: a failure is logged and the
 * files stay, the account deletion itself is never blocked by Cloudinary.
 */
export async function deleteShopFiles(shopId: string): Promise<void> {
  if (env.NODE_ENV === 'test' || !env.CLOUDINARY_API_SECRET) return;
  try {
    const { cloudName, apiKey, apiSecret } = credentials();
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`);
    url.searchParams.set('prefix', `${shopFolder(shopId)}/`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.warn('Cloudinary cleanup failed', shopId, response.status);
  } catch (error) {
    console.warn('Cloudinary cleanup failed', shopId, error);
  }
}
