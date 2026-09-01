import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Cifrado simétrico AES-256-GCM para tokens de OAuth de terceros.
 *
 * Modelo:
 *  - Clave de 32 bytes hex en `TOKEN_ENCRYPTION_KEY` (openssl rand -hex 32).
 *  - IV aleatorio de 12 bytes por operación (recomendado GCM).
 *  - Auth tag de 16 bytes verificado en decrypt — si el ciphertext
 *    ha sido manipulado, `decrypt` lanza error controlado.
 *  - Salida encoded como `v1:{ivHex}:{ctHex}:{tagHex}` para permitir
 *    rotación de esquema en el futuro (v2, v3...).
 *
 * Reutilizable para Discord, Twitch, futuros providers.
 *
 * Reglas:
 *  - NO logueamos el plaintext ni el ciphertext.
 *  - Errores no filtran contenido — solo el tipo de fallo.
 */

const KEY_HEX_LEN = 64;              // 32 bytes → 64 hex chars.
const IV_LEN = 12;                   // Recomendado GCM.
const TAG_LEN = 16;                  // AES-GCM auth tag.
const SCHEME_VERSION = 'v1';

export type EncryptedToken = string; // Formato: v1:{iv}:{ct}:{tag}

class TokenEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenEncryptionError';
  }
}

function loadKey(keyHex: string | undefined, name: string): Buffer {
  if (!keyHex) {
    throw new TokenEncryptionError(`${name} no configurada`);
  }
  if (keyHex.length !== KEY_HEX_LEN) {
    throw new TokenEncryptionError(`${name} debe ser hex de ${KEY_HEX_LEN} chars (32 bytes)`);
  }
  return Buffer.from(keyHex, 'hex');
}

function currentKey(): Buffer {
  return loadKey(env.TOKEN_ENCRYPTION_KEY, 'TOKEN_ENCRYPTION_KEY');
}

function nextKey(): Buffer {
  return loadKey(env.TOKEN_ENCRYPTION_KEY_NEXT, 'TOKEN_ENCRYPTION_KEY_NEXT');
}

function encryptWithKey(plaintext: string, key: Buffer): EncryptedToken {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SCHEME_VERSION}:${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Cifra `plaintext` (string UTF-8) y devuelve un token opaco
 * `v1:{ivHex}:{ctHex}:{tagHex}`.
 *
 * Lanza `TokenEncryptionError` si la clave no está configurada.
 * NO logueamos el plaintext.
 */
export function encrypt(plaintext: string): EncryptedToken {
  const key = env.TOKEN_ENCRYPTION_KEY_NEXT ? nextKey() : currentKey();
  return encryptWithKey(plaintext, key);
}

/**
 * Descifra un token producido por `encrypt`. Verifica auth tag
 * (integridad + autenticidad). Lanza `TokenEncryptionError` si:
 *  - Formato inválido.
 *  - Versión desconocida.
 *  - Clave incorrecta o ciphertext manipulado (auth tag mismatch).
 */
function decryptWithKey(token: EncryptedToken, key: Buffer): string {
  const parts = token.split(':');
  if (parts.length !== 4) {
    throw new TokenEncryptionError('Token cifrado con formato inválido');
  }
  const [version, ivHex, ctHex, tagHex] = parts;
  if (version !== SCHEME_VERSION) {
    throw new TokenEncryptionError(`Versión de cifrado no soportada: ${version ?? '(vacía)'}`);
  }
  if (!ivHex || !ctHex || !tagHex) {
    throw new TokenEncryptionError('Token cifrado incompleto');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new TokenEncryptionError('Token cifrado con tamaños inválidos');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf-8');
  } catch {
    throw new TokenEncryptionError('Fallo al descifrar token (integridad o clave)');
  }
}

export function decrypt(token: EncryptedToken): string {
  try {
    return decryptWithKey(token, currentKey());
  } catch (currentError) {
    if (!env.TOKEN_ENCRYPTION_KEY_NEXT) throw currentError;
    try {
      return decryptWithKey(token, nextKey());
    } catch {
      throw new TokenEncryptionError('Fallo al descifrar token (integridad o claves activas)');
    }
  }
}

/**
 * Re-cifra un token con la clave paralela. Es idempotente: si el token ya se
 * puede leer con NEXT no modifica el ciphertext. Nunca expone el texto plano.
 */
export function rotateEncryptedToken(token: EncryptedToken): { token: EncryptedToken; changed: boolean } {
  const current = currentKey();
  const next = nextKey();
  if (current.equals(next)) {
    throw new TokenEncryptionError('Las claves actual y paralela deben ser distintas');
  }

  try {
    decryptWithKey(token, next);
    return { token, changed: false };
  } catch {
    // El token todavía está cifrado con la clave actual.
  }

  const plaintext = decryptWithKey(token, current);
  const rotated = encryptWithKey(plaintext, next);
  if (decryptWithKey(rotated, next) !== plaintext) {
    throw new TokenEncryptionError('La verificación posterior a la rotación falló');
  }
  return { token: rotated, changed: true };
}

/** True si la utility puede operar (env var presente y con longitud válida). */
export function isTokenEncryptionConfigured(): boolean {
  const k = env.TOKEN_ENCRYPTION_KEY;
  return Boolean(k && k.length === KEY_HEX_LEN);
}

export function isTokenEncryptionRotationConfigured(): boolean {
  const current = env.TOKEN_ENCRYPTION_KEY;
  const next = env.TOKEN_ENCRYPTION_KEY_NEXT;
  return Boolean(
    current
    && next
    && current.length === KEY_HEX_LEN
    && next.length === KEY_HEX_LEN
    && current.toLowerCase() !== next.toLowerCase(),
  );
}

export { TokenEncryptionError };
