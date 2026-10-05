import { z } from "zod";

/** Digits typed by the user, spaces allowed ("15 000"), converted to an integer. */
function integerString(max: number, message: string) {
  return z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => /^\d+$/.test(v), message)
    .transform(Number)
    .refine((n) => n <= max, "Valeur trop grande.");
}

/** Required integer Ariary amount typed in a text field. */
export const amountField = integerString(
  1_000_000_000_000,
  "Montant en Ariary, sans virgule.",
);

/** Required non-negative integer quantity typed in a text field. */
export const quantityField = integerString(1_000_000, "Nombre entier attendu.");

/** Optional text: trimmed, empty becomes null. */
export const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((v) => v || null);

/** Integer → text for a form default value. */
export const toFieldValue = (n: number) => String(n);

/** "15 000" → 15000, or null if it is not a whole number. */
export const toInt = (text: string) => {
  const digits = text.replace(/\s/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
};
