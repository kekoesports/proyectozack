'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  PARTNER_CONSENT_COOKIE,
  PARTNER_CONSENT_COOKIE_OPTS,
  PARTNER_CONSENT_VALID_VALUE,
} from '@/lib/partner-consent';
import { insertConsent, revokeConsent } from '@/lib/queries/partnerConsent';
import { logGiveawayEvent, sha256 } from '@/lib/audit/logGiveawayEvent';

/**
 * Server action que registra el consent del usuario para ver comunicación
 * comercial de partners externos.
 *
 * Fase 1 legal — persistencia en `user_partner_consents`:
 *   - Fuente de verdad → tabla DB (via `hasActivePartnerConsent`).
 *   - Cookie `sp_partner_consent` se mantiene como acelerador de gating
 *     pero NO es fuente autoritativa. Se sincroniza al aceptar/revocar.
 *   - Se registra evento en `sp_audit_events` con ip_hash + user_agent.
 *
 * Reglas:
 *   - Requiere sesión (userId).
 *   - Requiere que el usuario haya marcado los 3 checkboxes en el modal
 *     (`age18`, `responsible`, `externalPartners`). El cliente ya lo
 *     valida; el server actúa como safety net.
 *
 * Ver docs/legal-risk-matrix.md.
 */
type Result = { ok: true } | { ok: false; error: string };

interface Input {
  age18:            boolean;
  responsible:      boolean;
  externalPartners: boolean;
}

export async function grantPartnerConsent(input: Input): Promise<Result> {
  const requestHeaders = await headers();

  if (!input.age18 || !input.responsible || !input.externalPartners) {
    // Auditoría del intento bloqueado — útil para detectar patrones anómalos.
    await logGiveawayEvent({
      userId:   null,
      action:   'partner_consent_granted',
      outcome:  'blocked',
      metadata: { reason: 'incomplete_checkboxes', input },
    });
    return { ok: false, error: 'Debes aceptar los 3 puntos antes de continuar.' };
  }

  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id ?? null;
  if (!userId) {
    await logGiveawayEvent({
      userId:  null,
      action:  'partner_consent_granted',
      outcome: 'unauthorized',
    });
    return { ok: false, error: 'Necesitas iniciar sesión con Steam antes de aceptar.' };
  }

  const rawIp =
    requestHeaders.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  const ipHash = rawIp ? sha256(rawIp) : null;
  const userAgent = (requestHeaders.get('user-agent') ?? '').slice(0, 500) || null;

  const consent = await insertConsent({ userId, ipHash, userAgent });

  // Sincronizar cookie para lecturas ligeras subsecuentes. NO es fuente
  // de verdad — el server component siempre lee DB antes de renderizar.
  const cookieStore = await cookies();
  cookieStore.set(PARTNER_CONSENT_COOKIE, PARTNER_CONSENT_VALID_VALUE, PARTNER_CONSENT_COOKIE_OPTS);

  await logGiveawayEvent({
    userId,
    action:  'partner_consent_granted',
    outcome: 'success',
    refType: 'user_partner_consent',
    refId:   consent.id,
    metadata: { consent_version: consent.consentVersion },
  });

  // Revalidar la ficha del creador (donde vive el gate) y el perfil.
  revalidatePath('/sorteos/[creatorSlug]', 'page');
  revalidatePath('/sorteos/perfil', 'page');
  revalidatePath('/sorteos/perfil/permisos', 'page');

  return { ok: true };
}

/** Revoca el consent activo del usuario. */
export async function revokePartnerConsent(): Promise<Result> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return { ok: false, error: 'Necesitas iniciar sesión con Steam.' };
  }

  await revokeConsent(userId);

  const cookieStore = await cookies();
  cookieStore.delete(PARTNER_CONSENT_COOKIE);

  await logGiveawayEvent({
    userId,
    action:  'partner_consent_revoked',
    outcome: 'success',
    refType: 'user_partner_consent',
  });

  revalidatePath('/sorteos/[creatorSlug]', 'page');
  revalidatePath('/sorteos/perfil', 'page');
  revalidatePath('/sorteos/perfil/permisos', 'page');

  return { ok: true };
}
