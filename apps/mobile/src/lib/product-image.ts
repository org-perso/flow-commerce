import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { apiFetch } from '@/lib/api-client';
import { auth } from '@/lib/firebase';

/** Longest side after resizing: plenty for a phone screen, light on mobile data. */
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.7;

/** Lets the user pick a photo (gallery or camera); returns its local uri, or null if cancelled. */
export async function pickProductImage(source: 'camera' | 'library'): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('permission-denied');

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

export type UploadKind = 'product' | 'logo';

type UploadSignature = {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

/**
 * Compresses the local image and uploads it to Cloudinary, into the shop's folder.
 * Returns the URL stored on the product (or as the shop logo).
 */
export async function uploadImage(
  shopId: string,
  kind: UploadKind,
  localUri: string,
): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_SIDE });
  const image = await context.renderAsync();
  const { uri } = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  try {
    return await uploadToCloudinary(shopId, kind, uri);
  } catch (error) {
    console.warn('Image upload failed', error);
    throw error instanceof ImageUploadError
      ? error
      : new ImageUploadError(imageUploadMessage(error));
  }
}

export const uploadProductImage = (shopId: string, localUri: string) =>
  uploadImage(shopId, 'product', localUri);

/**
 * The API signs the upload (the Cloudinary secret stays on the server, and the signature only
 * allows this shop's folder), then the file goes straight to Cloudinary.
 */
async function uploadToCloudinary(shopId: string, kind: UploadKind, localUri: string) {
  const sig = await apiFetch<UploadSignature>(`/shops/${shopId}/uploads/signature`, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
  const response = await FileSystem.uploadAsync(sig.uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    parameters: {
      api_key: sig.apiKey,
      timestamp: String(sig.timestamp),
      folder: sig.folder,
      signature: sig.signature,
    },
  });
  const body = JSON.parse(response.body || '{}') as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (response.status < 200 || response.status >= 300 || !body.secure_url) {
    console.warn('Cloudinary upload', response.status, body.error?.message);
    throw new ImageUploadError(
      `La photo n'a pas pu être envoyée (HTTP ${response.status}). Réessayez, ou enregistrez sans photo.`,
    );
  }
  return body.secure_url;
}

/**
 * Cloudinary URL resized on the fly (square, WebP/AVIF when supported): light thumbnails in
 * lists. Other URLs (older Firebase photos) are returned as they are.
 */
export function sizedImage(url: string, px: number): string {
  if (!url.startsWith('https://res.cloudinary.com/')) return url;
  return url.replace('/image/upload/', `/image/upload/c_fill,w_${px},h_${px},f_auto,q_auto/`);
}

/** Anything else: usually no network during the upload. */
function imageUploadMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `La photo n'a pas pu être envoyée (${detail}). Vérifiez la connexion, ou enregistrez sans photo.`;
}

/** Upload failure whose message is ready for the seller (shown as is by apiErrorMessage). */
export class ImageUploadError extends Error {}

/** A picked image not uploaded yet (local file) vs an already stored URL. */
export const isLocalImage = (uri: string) => !uri.startsWith('http');

/** Removes a stored photo (account deletion). Best effort: a failure leaves the file. */
export async function deleteStoredImage(url: string): Promise<void> {
  if (!url.startsWith('https://firebasestorage.googleapis.com/')) return;
  const token = await auth.currentUser?.getIdToken();
  await fetch(url.split('?')[0]!, {
    method: 'DELETE',
    headers: token ? { Authorization: `Firebase ${token}` } : {},
  }).catch(() => {});
}
