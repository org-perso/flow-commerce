import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.url(),
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  /** Optional: only needed if push security is enabled on the Expo project. */
  EXPO_ACCESS_TOKEN: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /**
   * Origins of the admin space (cookies are sent cross-origin, so only these are allowed on
   * /api/v1/admin). Comma-separated, e.g. https://admin.flow-commerce.com.
   */
  ADMIN_CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /**
   * 32-byte key (base64) encrypting the admins' TOTP secrets. Optional so the seller API starts
   * without it; the admin sign-in answers 503 until it is set. `openssl rand -base64 32`.
   */
  ADMIN_MFA_KEY: z
    .string()
    .optional()
    .refine((v) => !v || Buffer.from(v, 'base64').length === 32, 'Expected 32 bytes in base64.'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
