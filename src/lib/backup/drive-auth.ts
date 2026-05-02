/**
 * Autenticación con Google Drive API usando Service Account (JWT).
 * No requiere googleapis npm — usa Node.js crypto nativo.
 */
import { createSign } from 'crypto';
import { getDriveConfig } from '@/lib/backup/getDriveConfig';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Cache en memoria: el token dura 1 hora, reusamos en la misma invocación
let cachedToken: { token: string; expiresAt: number } | null = null;

function buildJwt(email: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  // La clave viene con \n escapados — los restauramos
  const pem = privateKey.replace(/\\n/g, '\n');
  const sig = sign.sign(pem).toString('base64url');

  return `${header}.${payload}.${sig}`;
}

export async function getDriveAccessToken(): Promise<string> {
  // Reusar si no ha expirado
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const cfg = getDriveConfig();
  if (!cfg.ok) throw new Error(cfg.error);

  const jwt = buildJwt(cfg.config.serviceAccountEmail, cfg.config.serviceAccountPrivateKey);

  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth error: ${res.status} — ${err}`);
  }

  const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}
