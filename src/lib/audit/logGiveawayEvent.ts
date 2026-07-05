import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { giveawayAuditEvents, AUDIT_ACTIONS, AUDIT_OUTCOMES, type AuditAction, type AuditOutcome } from '@/db/schema';

/**
 * Registra un evento en `sp_audit_events` (el log central de auditoría
 * para SocialPro Giveaways).
 *
 * Fase 1 legal — ver docs/legal-risk-matrix.md.
 *
 * Se llama desde server actions críticas: participación en sorteo,
 * canje, verificación/claim de misión, aceptación/revocación de consent.
 *
 * Nunca lanza — un fallo al escribir el log no debe abortar la acción
 * principal (canje, participación, etc.). Devuelve `boolean` por si
 * el caller quiere reaccionar en test.
 *
 * `ipHash` es SHA-256 de la primera IP en `x-vercel-forwarded-for` /
 * `x-forwarded-for` (headers de confianza en Vercel), NO la IP en claro.
 */

const ALLOWED_ACTIONS = new Set<string>(AUDIT_ACTIONS);
const ALLOWED_OUTCOMES = new Set<string>(AUDIT_OUTCOMES);

export interface LogEventInput {
  readonly userId:   string | null;
  readonly action:   AuditAction;
  readonly outcome:  AuditOutcome;
  readonly refType?: string | null;
  readonly refId?:   number | null;
  readonly metadata?: Record<string, unknown> | null;
}

export async function logGiveawayEvent(input: LogEventInput): Promise<boolean> {
  // Guardrail — set cerrado.
  if (!ALLOWED_ACTIONS.has(input.action)) {
    // No throw — es forensics, no debemos romper la acción principal.
    console.error(`[audit] Rejected unknown action: ${input.action}`);
    return false;
  }
  if (!ALLOWED_OUTCOMES.has(input.outcome)) {
    console.error(`[audit] Rejected unknown outcome: ${input.outcome}`);
    return false;
  }

  try {
    const h = await headers();
    const rawIp =
      h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    const ipHash = rawIp ? sha256(rawIp) : null;
    const userAgent = (h.get('user-agent') ?? '').slice(0, 500) || null;
    const country = h.get('x-vercel-ip-country')?.slice(0, 2) ?? null;

    await db.insert(giveawayAuditEvents).values({
      userId:    input.userId,
      action:    input.action,
      outcome:   input.outcome,
      refType:   input.refType ?? null,
      refId:     input.refId ?? null,
      metadata:  input.metadata ?? null,
      ipHash,
      userAgent,
      country,
    });
    return true;
  } catch (err) {
    console.error('[audit] Failed to write event:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Devuelve el hash SHA-256 hex de la string dada. Uso interno. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
