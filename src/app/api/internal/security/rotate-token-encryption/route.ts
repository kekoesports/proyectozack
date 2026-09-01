import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { connectedSocialAccounts } from '@/db/schema';
import {
  isTokenEncryptionRotationConfigured,
  rotateEncryptedToken,
} from '@/lib/crypto/token-encryption';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';

/**
 * Operación de mantenimiento de un solo uso para rotar tokens OAuth.
 *
 * Seguridad:
 * - exige el Bearer de cron;
 * - permanece apagada salvo kill switch explícito;
 * - las claves solo se leen del entorno del servidor;
 * - la respuesta y los logs contienen únicamente contadores;
 * - toda la tabla se bloquea y se actualiza en una transacción.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  if (!env.TOKEN_ENCRYPTION_ROTATION_ENABLED) {
    return NextResponse.json({ error: 'Rotation disabled' }, { status: 503 });
  }
  if (!isTokenEncryptionRotationConfigured()) {
    return NextResponse.json({ error: 'Rotation keys misconfigured' }, { status: 503 });
  }

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: connectedSocialAccounts.id,
        accessTokenEncrypted: connectedSocialAccounts.accessTokenEncrypted,
        refreshTokenEncrypted: connectedSocialAccounts.refreshTokenEncrypted,
      })
      .from(connectedSocialAccounts)
      .for('update');

    let rowsChanged = 0;
    let tokensChanged = 0;

    for (const row of rows) {
      const access = rotateEncryptedToken(row.accessTokenEncrypted);
      const refresh = row.refreshTokenEncrypted
        ? rotateEncryptedToken(row.refreshTokenEncrypted)
        : null;

      if (!access.changed && !refresh?.changed) continue;

      await tx
        .update(connectedSocialAccounts)
        .set({
          accessTokenEncrypted: access.token,
          refreshTokenEncrypted: refresh?.token ?? row.refreshTokenEncrypted,
        })
        .where(eq(connectedSocialAccounts.id, row.id));

      rowsChanged += 1;
      tokensChanged += Number(access.changed) + Number(refresh?.changed ?? false);
    }

    return { rowsScanned: rows.length, rowsChanged, tokensChanged };
  });

  console.info('[security] token encryption rotation completed', result);
  return NextResponse.json({ success: true, ...result });
}
