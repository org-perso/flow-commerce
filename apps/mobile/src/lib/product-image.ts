import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { auth, storage } from '@/lib/firebase';

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

/**
 * Compresses the local image and uploads it to Firebase Storage under the shop.
 * Returns the public download URL stored on the product.
 */
export async function uploadProductImage(shopId: string, localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_SIDE });
  const image = await context.renderAsync();
  const { uri } = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const path = `shops/${shopId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  try {
    return await uploadToStorage(uri, path);
  } catch (error) {
    console.warn('Product image upload failed', error);
    throw error instanceof ImageUploadError
      ? error
      : new ImageUploadError(imageUploadMessage(error));
  }
}

/**
 * Sends the file straight to the Firebase Storage REST API, with the user's ID token
 * (Storage rules apply as with the SDK). The JS SDK's uploadBytes needs a Blob, and
 * React Native blobs make it fail on Android with storage/unknown.
 */
async function uploadToStorage(localUri: string, path: string): Promise<string> {
  const bucket = storage.app.options.storageBucket;
  if (!bucket) throw new ImageUploadError('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET est vide.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new ImageUploadError('Session expirée. Reconnectez-vous.');

  const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
  const response = await FileSystem.uploadAsync(
    `${base}?uploadType=media&name=${encodeURIComponent(path)}`,
    localUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { Authorization: `Firebase ${token}`, 'Content-Type': 'image/jpeg' },
    },
  );
  if (response.status < 200 || response.status >= 300) {
    console.warn('Storage upload', response.status, response.body, `bucket: ${bucket}`);
    throw new ImageUploadError(storageStatusMessage(response.status));
  }
  const { downloadTokens } = JSON.parse(response.body) as { downloadTokens?: string };
  const token0 = downloadTokens?.split(',')[0];
  return `${base}/${encodeURIComponent(path)}?alt=media${token0 ? `&token=${token0}` : ''}`;
}

function storageStatusMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'Envoi de la photo refusé : vérifiez les règles de sécurité de Firebase Storage.';
  }
  if (status === 404) {
    return 'Bucket Firebase Storage introuvable : Storage est-il activé, et le nom du bucket exact ?';
  }
  return `La photo n'a pas pu être envoyée (HTTP ${status}). Réessayez, ou enregistrez sans photo.`;
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
