import crypto from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Cifrado AES-256-GCM de tokens sociales guardados en DB.
 *
 * Bundle format (base64):
 *   [ nonce(12B) | ciphertext | authTag(16B) ]
 *
 * La key vive en env.SOCIAL_TOKEN_ENCRYPTION_KEY (32 bytes en base64).
 * Si no está configurada, encryptToken/decryptToken lanzan — los callers
 * responden 503 al usuario. Esto permite arrancar la app en local sin
 * la key seteada.
 *
 * NUNCA loggear plaintexts ni ciphertexts. Nunca serializar a UI.
 */

const ALGO = 'aes-256-gcm';
const NONCE_LEN = 12;
const TAG_LEN = 16;

/** Cifra `plaintext` y devuelve el bundle base64. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, encrypted, tag]).toString('base64');
}

/**
 * Descifra un bundle base64. Throws si:
 *   - `SOCIAL_TOKEN_ENCRYPTION_KEY` no está configurado.
 *   - El bundle es corto/malformado.
 *   - La autenticación GCM falla (tampering detectado).
 */
export function decryptToken(bundle: string): string {
  const key = getKey();
  const buf = safeFromBase64(bundle);
  // NONCE_LEN + TAG_LEN es el mínimo (permite ciphertext vacío).
  if (buf.length < NONCE_LEN + TAG_LEN) {
    throw new Error('Token cifrado inválido');
  }
  const nonce = buf.subarray(0, NONCE_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const cipher = buf.subarray(NONCE_LEN, buf.length - TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8');
}

/** Devuelve `true` si la key está configurada y es válida. */
export function isSocialCryptoConfigured(): boolean {
  try { getKey(); return true; }
  catch { return false; }
}

function getKey(): Buffer {
  const raw = env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY no configurada');
  const buf = safeFromBase64(raw);
  if (buf.length !== 32) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY debe tener 32 bytes');
  return buf;
}

function safeFromBase64(s: string): Buffer {
  // Buffer.from acepta strings inválidos "silenciosamente" — validamos que
  // la vuelta a base64 (sin padding) coincida para detectar corrupción.
  try {
    const b = Buffer.from(s, 'base64');
    if (b.length === 0 && s.length > 0) throw new Error('base64 vacío');
    return b;
  } catch {
    throw new Error('base64 inválido');
  }
}
