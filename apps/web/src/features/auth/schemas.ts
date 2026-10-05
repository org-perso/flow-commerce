import { z } from "zod";

const email = z.email("Adresse email invalide.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis."),
});

export const signUpSchema = z
  .object({
    email,
    password: z.string().min(8, "Au moins 8 caractères."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
