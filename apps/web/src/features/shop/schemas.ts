import { z } from "zod";

export const shopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de la boutique est requis.")
    .max(150, "150 caractères maximum."),
  description: z.string().trim().max(1000, "1000 caractères maximum."),
});

export type ShopFormValues = z.infer<typeof shopSchema>;

export function toShopInput(values: ShopFormValues) {
  return { name: values.name, description: values.description || null };
}
