'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { deleteSocialAccount } from '@/lib/social/accounts';
import { isActiveProvider } from '@/lib/social/providers';
import { revokeToken } from '@/lib/social/oauth';

type ActionResult = { ok: true } | { ok: false; error: string };

const disconnectSchema = z.object({
  provider: z.string().min(1),
});

/**
 * Desconecta una cuenta social del usuario logueado.
 *
 * 1. Guard sesión.
 * 2. Zod validate provider ∈ active.
 * 3. Delete row (retorna access_token descifrado si existía).
 * 4. Best-effort revoke en el provider (timeout 3s, swallow errors).
 * 5. Revalidate /sorteos/plataforma/perfil.
 */
export async function disconnectSocialAccount(input: unknown): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: 'no_session' };

  const parsed = disconnectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const { provider } = parsed.data;
  if (!isActiveProvider(provider)) return { ok: false, error: 'provider_unknown' };

  const removed = await deleteSocialAccount({ userId: session.user.id, provider });
  if (!removed) return { ok: false, error: 'not_connected' };

  // Fire-and-forget revoke — no bloqueamos el flujo si el provider tarda.
  if (removed.accessToken) {
    // No await intencional: revoke tiene su propio timeout interno.
    void revokeToken(provider, removed.accessToken);
  }

  revalidatePath('/sorteos/plataforma/perfil');
  return { ok: true };
}
