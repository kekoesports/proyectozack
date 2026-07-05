'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  PARTNER_CONSENT_COOKIE,
  PARTNER_CONSENT_COOKIE_OPTS,
  PARTNER_CONSENT_VALID_VALUE,
} from '@/lib/partner-consent';

/**
 * Server action que registra el consent del usuario para ver comunicación
 * comercial de partners externos.
 *
 * Reglas actuales (MVP):
 *   - Requiere sesión (userId) — no se acepta consent anónimo.
 *   - Requiere que el usuario haya marcado los 3 checkboxes en el modal
 *     (`age18`, `responsible`, `externalPartners`). El cliente ya lo
 *     valida; el server actúa como safety net.
 *
 * Fase 1: mover a tabla `user_partner_consents` (userId, granted_at,
 * ip_hash, user_agent, consent_version). Ver docs/legal/todos-abogado.md.
 */
type Result = { ok: true } | { ok: false; error: string };

interface Input {
  age18:            boolean;
  responsible:      boolean;
  externalPartners: boolean;
}

export async function grantPartnerConsent(input: Input): Promise<Result> {
  if (!input.age18 || !input.responsible || !input.externalPartners) {
    return { ok: false, error: 'Debes aceptar los 3 puntos antes de continuar.' };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user?.id) {
    return { ok: false, error: 'Necesitas iniciar sesión con Steam antes de aceptar.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(PARTNER_CONSENT_COOKIE, PARTNER_CONSENT_VALID_VALUE, PARTNER_CONSENT_COOKIE_OPTS);

  // Revalidar la ruta actual para que el server component vuelva a leer
  // la cookie y renderice las cards en lugar del gate.
  revalidatePath('/sorteos/[creatorSlug]', 'page');

  return { ok: true };
}

/** Revoca el consent (para pantalla de gestión futura). */
export async function revokePartnerConsent(): Promise<Result> {
  const cookieStore = await cookies();
  cookieStore.delete(PARTNER_CONSENT_COOKIE);
  revalidatePath('/sorteos/[creatorSlug]', 'page');
  return { ok: true };
}
