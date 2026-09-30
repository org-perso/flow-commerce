import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

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

  const blob = await (await fetch(uri)).blob();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const fileRef = ref(storage, `shops/${shopId}/products/${name}`);
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
}

/** A picked image not uploaded yet (local file) vs an already stored URL. */
export const isLocalImage = (uri: string) => !uri.startsWith('http');
