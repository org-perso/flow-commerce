import { ApiError, apiFetch, ImageUploadError } from "@/lib/api-client";
import { getFirebaseAuth } from "@/lib/firebase";

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

export type UploadKind = "product" | "logo";

type UploadSignature = {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

/**
 * Compresses the picked image and uploads it to Cloudinary, into the shop's folder (the API
 * signs the upload: the secret stays on the server). Returns the URL to store.
 */
export async function uploadImage(
  shopId: string,
  kind: UploadKind,
  file: File,
): Promise<string> {
  const blob = await compressImage(file);
  try {
    const sig = await apiFetch<UploadSignature>(
      `/shops/${shopId}/uploads/signature`,
      { method: "POST", body: JSON.stringify({ kind }) },
    );
    const form = new FormData();
    form.append("file", blob, "photo.jpg");
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("folder", sig.folder);
    form.append("signature", sig.signature);
    const response = await fetch(sig.uploadUrl, { method: "POST", body: form });
    const body = (await response.json().catch(() => ({}))) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!response.ok || !body.secure_url) {
      console.warn("Cloudinary upload", response.status, body.error?.message);
      throw new ImageUploadError(
        `La photo n'a pas pu être envoyée (HTTP ${response.status}). Réessayez, ou enregistrez sans photo.`,
      );
    }
    return body.secure_url;
  } catch (error) {
    console.warn("Image upload failed", error);
    if (error instanceof ImageUploadError || error instanceof ApiError)
      throw error;
    throw new ImageUploadError(imageUploadMessage(error));
  }
}

export const uploadProductImage = (shopId: string, file: File) =>
  uploadImage(shopId, "product", file);

/**
 * Cloudinary URL resized on the fly (square, WebP/AVIF when supported): light thumbnails.
 * Other URLs (older Firebase photos) are returned as they are.
 */
export function sizedImage(url: string, px: number): string {
  if (!url.startsWith("https://res.cloudinary.com/")) return url;
  return url.replace(
    "/image/upload/",
    `/image/upload/c_fill,w_${px},h_${px},f_auto,q_auto/`,
  );
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
