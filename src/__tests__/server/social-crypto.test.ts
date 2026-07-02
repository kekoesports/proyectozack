/**
 * AES-256-GCM encrypt/decrypt de tokens sociales.
 * Puros — sin DB, sin red. Mutan process.env para setear la key.
 */

import crypto from 'node:crypto';

// La key debe estar en env ANTES de que src/lib/env.ts se evalúe.
// Como env.ts corre createEnv en top level, seteamos aquí, ANTES del import.
const goodKey = crypto.randomBytes(32).toString('base64');
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = goodKey;

// Evita el ciclo de cache — importamos dentro de tests para poder resetear
// env entre casos si hace falta.
import { encryptToken, decryptToken, isSocialCryptoConfigured } from '@/lib/social/crypto';

describe('[social-crypto] round-trip', () => {
  it('encrypt → decrypt devuelve el plaintext original', () => {
    const plain = 'token-de-prueba-abc123';
    const bundle = encryptToken(plain);
    expect(decryptToken(bundle)).toBe(plain);
  });

  it('empty string cifra y descifra OK', () => {
    const bundle = encryptToken('');
    expect(decryptToken(bundle)).toBe('');
  });

  it('token largo (típico OAuth access_token) round-trips', () => {
    const long = 'gho_' + 'a'.repeat(200) + '_end';
    expect(decryptToken(encryptToken(long))).toBe(long);
  });
});

describe('[social-crypto] aleatoriedad del nonce', () => {
  it('diferentes ciphertexts del mismo plaintext (nonce único)', () => {
    const plain = 'mismo-plaintext';
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) set.add(encryptToken(plain));
    expect(set.size).toBe(50);
  });
});

describe('[social-crypto] resistencia a tampering', () => {
  it('bit-flip en nonce → decrypt throws', () => {
    const bundle = encryptToken('sensitive');
    const buf = Buffer.from(bundle, 'base64');
    buf[0] = (buf[0] ?? 0) ^ 0x01; // flip in nonce region
    const tampered = buf.toString('base64');
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('bit-flip en cipher → decrypt throws (authTag falla)', () => {
    const bundle = encryptToken('sensitive-mid-length-blob');
    const buf = Buffer.from(bundle, 'base64');
    const mid = Math.floor(buf.length / 2);
    buf[mid] = (buf[mid] ?? 0) ^ 0x40;
    expect(() => decryptToken(buf.toString('base64'))).toThrow();
  });

  it('bit-flip en authTag → decrypt throws', () => {
    const bundle = encryptToken('sensitive');
    const buf = Buffer.from(bundle, 'base64');
    buf[buf.length - 1] = (buf[buf.length - 1] ?? 0) ^ 0x01;
    expect(() => decryptToken(buf.toString('base64'))).toThrow();
  });
});

describe('[social-crypto] configuración inválida', () => {
  it('bundle base64 malformado → decrypt throws', () => {
    expect(() => decryptToken('###')).toThrow();
  });

  it('bundle demasiado corto → decrypt throws', () => {
    // 8 bytes no llega ni al nonce
    const tiny = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]).toString('base64');
    expect(() => decryptToken(tiny)).toThrow();
  });

  it('isSocialCryptoConfigured() es true con key válida', () => {
    expect(isSocialCryptoConfigured()).toBe(true);
  });
});
