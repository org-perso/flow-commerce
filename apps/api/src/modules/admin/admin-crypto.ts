import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

import { env } from '../../config/env.js';
import { ProblemError } from '../../http/problem.js';

// Security primitives of the admin sign-in, on Node's crypto only (no native dependency).

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// OWASP-recommended scrypt cost (N = 2^17, r = 8, p = 1).
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, keylen: 32 };

/** Hash stored as "scrypt$N$r$p$salt$hash" (base64), so the cost can change later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 256 * 1024 * 1024,
  });
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 256 * 1024 * 1024,
  });
  return timingSafeEqual(actual, expected);
}

/** A valid hash of a random password: verified when the username is unknown (same timing). */
export const DUMMY_HASH_PROMISE = hashPassword(randomBytes(16).toString('hex'));

/** Session tokens and recovery codes are random; only their SHA-256 is stored. */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const randomToken = () => randomBytes(32).toString('base64url');

// --- TOTP (RFC 6238: 30 s steps, 6 digits, SHA-1, as Google Authenticator expects) ---

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Invalid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 160-bit secret, base32 (the form authenticator apps read). */
export const generateTotpSecret = () => base32Encode(randomBytes(20));

const STEP_SECONDS = 30;

export const currentTotpStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

/**
 * The time step the code belongs to (now, or one step either side for clock drift), or null.
 * Steps up to `lastStep` are refused: a code is never accepted twice.
 */
export function verifyTotp(secret: string, code: string, lastStep: number | null): number | null {
  const now = currentTotpStep();
  for (const step of [now - 1, now, now + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    const expected = Buffer.from(totpCode(secret, step));
    const given = Buffer.from(code);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return step;
  }
  return null;
}

export const otpauthUrl = (secret: string, username: string) =>
  `otpauth://totp/${encodeURIComponent(`Flow.Co Admin:${username}`)}?secret=${secret}` +
  `&issuer=${encodeURIComponent('Flow.Co Admin')}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;

// --- TOTP secrets at rest: AES-256-GCM with ADMIN_MFA_KEY ---

function mfaKey(): Buffer {
  if (!env.ADMIN_MFA_KEY) {
    throw new ProblemError(503, 'Service Unavailable', 'The admin space is not configured.');
  }
  return Buffer.from(env.ADMIN_MFA_KEY, 'base64');
}

/** Throws 503 when ADMIN_MFA_KEY is missing: checked before any admin sign-in. */
export const assertAdminConfigured = () => void mfaKey();

/** "iv.tag.ciphertext", base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', mfaKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', mfaKey(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8');
}

/** 8 recovery codes like "7KQ4-M2XP": no ambiguous characters (0/O, 1/I). */
export function generateRecoveryCodes(): string[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => {
    const chars = Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

/** Recovery codes are compared without dash or case. */
export const normalizeRecoveryCode = (code: string) => code.replace(/[\s-]/g, '').toUpperCase();
