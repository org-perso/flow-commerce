import { ImageUploadError } from "@/lib/api-client";
import { getFirebaseAuth, storageBucket } from "@/lib/firebase";

/** Width after resizing (as on mobile): plenty for a screen, light on mobile data. */
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.7;

/** Resizes the picked file to 1024 px wide (never upscaled) and re-encodes it as JPEG 0.7. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context)
    throw new ImageUploadError(
      "Votre navigateur ne peut pas préparer la photo.",
    );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new ImageUploadError("La photo n’a pas pu être préparée.")),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

/**
 * Compresses the picked image and uploads it to Firebase Storage under the shop
 * (shops/{shopId}/products/...), through the Storage REST API like the mobile app.
 * Returns the public download URL stored on the product.
 */
export async function uploadProductImage(
  shopId: string,
  file: File,
): Promise<string> {
  const blob = await compressImage(file);
  const path = `shops/${shopId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  try {
    return await uploadToStorage(blob, path);
  } catch (error) {
    console.warn("Product image upload failed", error);
    throw error instanceof ImageUploadError
      ? error
      : new ImageUploadError(imageUploadMessage(error));
  }
}

async function uploadToStorage(blob: Blob, path: string): Promise<string> {
  const bucket = storageBucket();
  if (!bucket)
    throw new ImageUploadError("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET est vide.");
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new ImageUploadError("Session expirée. Reconnectez-vous.");

  const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
  const response = await fetch(
    `${base}?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Firebase ${token}`,
        "Content-Type": "image/jpeg",
      },
      body: blob,
    },
  );
  if (!response.ok) {
    console.warn("Storage upload", response.status, `bucket: ${bucket}`);
    throw new ImageUploadError(storageStatusMessage(response.status));
  }
  const { downloadTokens } = (await response.json()) as {
    downloadTokens?: string;
  };
  const firstToken = downloadTokens?.split(",")[0];
  return `${base}/${encodeURIComponent(path)}?alt=media${firstToken ? `&token=${firstToken}` : ""}`;
}

function storageStatusMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Envoi de la photo refusé : vérifiez les règles de sécurité de Firebase Storage.";
  }
  if (status === 404) {
    return "Bucket Firebase Storage introuvable : Storage est-il activé, et le nom du bucket exact ?";
  }
  return `La photo n'a pas pu être envoyée (HTTP ${status}). Réessayez, ou enregistrez sans photo.`;
}

function imageUploadMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `La photo n'a pas pu être envoyée (${detail}). Vérifiez la connexion, ou enregistrez sans photo.`;
}

/** Removes a stored photo (account deletion). Best effort: a failure leaves the file. */
export async function deleteStoredImage(url: string): Promise<void> {
  if (!url.startsWith("https://firebasestorage.googleapis.com/")) return;
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  await fetch(url.split("?")[0]!, {
    method: "DELETE",
    headers: token ? { Authorization: `Firebase ${token}` } : {},
  }).catch(() => {});
}
