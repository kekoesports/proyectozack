'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { canApproveActionClass } from '@/lib/agents/policy';
import { logRedacted } from '@/lib/log';
import { hasPermission, requirePermission, type Action, type Module } from '@/lib/permissions';
import { getApproval } from '@/lib/queries/agents/approvals';
import { setAgentMode, setAgentStatus } from '@/lib/queries/agents/definitions';
import { createAgentMemory, revokeAgentMemory, verifyAgentMemory } from '@/lib/queries/agents/memories';
import { decideApprovalAndResumeRun, unstickRun } from '@/lib/queries/agents/resume';
import { requestAgentRunCancellation } from '@/lib/queries/agents/runs';
import { setAgentScheduleEnabled } from '@/lib/queries/agents/schedules';

/**
 * Acciones del panel de agentes.
 *
 * Todas empiezan por `requirePermission`. Ninguna se fía de lo que llegue del
 * formulario para decidir si puede hacerse: el id llega del cliente, el permiso
 * sale de la sesión.
 */

export type ActionResult =
  | { readonly ok: true; readonly message?: string }
  | { readonly ok: false; readonly error: string };

const idSchema = z.object({ id: z.coerce.number().int().positive() });

function fallo(error: string): ActionResult {
  return { ok: false, error };
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

const cambioEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['active', 'paused', 'disabled']),
});

/**
 * Enciende o apaga un agente.
 *
 * Es el kill switch accionable desde la UI. `AGENTS_ENABLED` es una variable de
 * entorno y no se puede cambiar desde una página: se muestra, pero el
 * interruptor de verdad es este.
 *
 * Exige `agents:manage` —solo admin—: encender un agente es la decisión con más
 * consecuencias de todo el panel.
 */
export async function setAgentStatusAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'manage');

  const parsed = cambioEstadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  await setAgentStatus(parsed.data.id, parsed.data.status);
  logRedacted('info', `[agents] ${sesion.user.id} cambió el estado del agente ${parsed.data.id}`);
  revalidatePath('/admin/agents');
  return { ok: true, message: `Agente ${parsed.data.status}.` };
}

const cambioModoSchema = z.object({
  id: z.coerce.number().int().positive(),
  mode: z.enum(['shadow', 'recommend', 'execute']),
});

/**
 * Cambia el grado de autonomía.
 *
 * Igual que el estado, es `agents:manage`. Pasar de `shadow` a `execute` es
 * exactamente lo que el blueprint pide medir antes de hacer, así que no puede
 * ser una casilla que marque cualquiera con acceso de escritura.
 */
export async function setAgentModeAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'manage');

  const parsed = cambioModoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  await setAgentMode(parsed.data.id, parsed.data.mode);
  logRedacted('info', `[agents] ${sesion.user.id} cambió el modo del agente ${parsed.data.id}`);
  revalidatePath('/admin/agents');
  return { ok: true, message: `Modo ${parsed.data.mode}.` };
}

// ── Aprobaciones ─────────────────────────────────────────────────────────────

const decisionSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(500).optional(),
});

/**
 * Decide una aprobación pendiente.
 *
 * **Tres puertas**, y ninguna sustituye a las otras:
 *
 * 1. `agents:approve` — permiso para entrar al centro de aprobaciones.
 * 2. `canApproveActionClass` — las acciones privilegiadas son solo de admin.
 * 3. El permiso de dominio de la tool concreta, revalidado **ahora**. El
 *    snapshot guardado en `required_permission_*` es auditoría, no
 *    autorización: dice qué se pidió entonces, no qué puede hacer quien firma
 *    hoy.
 *
 * Y la decisión mueve la ejecución en la misma transacción. Aprobar sin
 * reencolar dejaría la ejecución parada para siempre.
 */
export async function decideApprovalAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'approve');

  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  const aprobacion = await getApproval(parsed.data.id);
  if (!aprobacion) return fallo('La aprobación ya no existe.');

  // Puerta 2: la clase de acción manda sobre el rol.
  if (!canApproveActionClass(sesion.user.role, aprobacion.actionClass)) {
    logRedacted(
      'warn',
      `[agents] ${sesion.user.id} intentó aprobar una acción ${aprobacion.actionClass} sin rango`,
    );
    return fallo('Tu rol no puede aprobar acciones de esta clase.');
  }

  // Puerta 3: el permiso de dominio, comprobado contra el rol de AHORA.
  if (aprobacion.requiredPermissionModule && aprobacion.requiredPermissionAction) {
    const modulo = aprobacion.requiredPermissionModule as Module;
    const accion = aprobacion.requiredPermissionAction as Action;
    if (!hasPermission(sesion.user.role, modulo, accion)) {
      return fallo(`Te falta el permiso ${modulo}:${accion} que exige esta acción.`);
    }
  }

  const resultado = await decideApprovalAndResumeRun({
    approvalId: parsed.data.id,
    decision: parsed.data.decision,
    decidedByUserId: sesion.user.id,
    note: parsed.data.note ?? null,
  });

  if (!resultado.ok) {
    return fallo(mensajeDeError(resultado.code));
  }

  logRedacted(
    'info',
    `[agents] ${sesion.user.id} ${parsed.data.decision} la aprobación ${parsed.data.id}`,
  );
  revalidatePath('/admin/agents/approvals');
  revalidatePath('/admin/agents/runs');

  return {
    ok: true,
    message:
      parsed.data.decision === 'approved'
        ? 'Aprobada. La ejecución vuelve a la cola.'
        : 'Rechazada. La ejecución queda cancelada.',
  };
}

function mensajeDeError(code: string): string {
  switch (code) {
    case 'approval_already_decided':
      return 'Alguien ya la decidió.';
    case 'approval_expired':
      return 'Caducó. Hay que pedirla de nuevo: el contexto que la justificaba ya no es el mismo.';
    case 'approval_not_pending':
      return 'La aprobación ya no está pendiente.';
    default:
      return 'No se pudo aplicar la decisión.';
  }
}

// ── Ejecuciones ──────────────────────────────────────────────────────────────

/**
 * Pide la cancelación de una ejecución.
 *
 * Cooperativa: el worker la mira entre pasos. No mata nada a mitad de una tool,
 * que es justo lo que dejaría una escritura a medias sin quién la reintente.
 */
export async function cancelRunAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'write');

  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  await requestAgentRunCancellation(parsed.data.id);
  logRedacted('info', `[agents] ${sesion.user.id} pidió cancelar la ejecución ${parsed.data.id}`);
  revalidatePath('/admin/agents/runs');
  return { ok: true, message: 'Cancelación pedida. Se aplicará en el siguiente paso.' };
}

/**
 * Desatasca una ejecución con los intentos agotados.
 *
 * Sube `max_attempts` en uno. Es manual y explícito: subirlo solo convertiría el
 * límite de reintentos en una sugerencia.
 */
export async function unstickRunAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'manage');

  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  const ok = await unstickRun(parsed.data.id);
  if (!ok) return fallo('Esa ejecución no está atascada.');

  logRedacted('info', `[agents] ${sesion.user.id} desatascó la ejecución ${parsed.data.id}`);
  revalidatePath('/admin/agents/runs');
  return { ok: true, message: 'Devuelta a la cola con un intento más.' };
}

// ── Rutinas ──────────────────────────────────────────────────────────────────

const rutinaSchema = z.object({
  id: z.coerce.number().int().positive(),
  enabled: z.enum(['true', 'false']),
  nextRunAt: z.string().datetime().optional(),
});

/**
 * Activa o desactiva una rutina.
 *
 * Activar exige próxima ventana: `agent_schedules_enabled_next_ck` no admite
 * una rutina activa sin fecha, y una así no se dispararía nunca sin que nadie
 * lo notara.
 */
export async function setScheduleEnabledAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'manage');

  const parsed = rutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  const enabled = parsed.data.enabled === 'true';
  if (enabled && !parsed.data.nextRunAt) {
    return fallo('Para activarla hace falta la próxima ejecución.');
  }

  try {
    await setAgentScheduleEnabled(
      parsed.data.id,
      enabled,
      parsed.data.nextRunAt ? new Date(parsed.data.nextRunAt) : null,
    );
  } catch (err) {
    logRedacted('warn', '[agents] no se pudo cambiar la rutina:', err);
    return fallo('No se pudo cambiar la rutina.');
  }

  logRedacted('info', `[agents] ${sesion.user.id} ${enabled ? 'activó' : 'desactivó'} la rutina ${parsed.data.id}`);
  revalidatePath('/admin/agents/schedules');
  return { ok: true, message: enabled ? 'Rutina activada.' : 'Rutina desactivada.' };
}

// ── Memoria ──────────────────────────────────────────────────────────────────

const memoriaSchema = z.object({
  scope: z.enum(['user', 'team', 'agent', 'global']),
  scopeUserId: z.string().max(80).optional(),
  agentId: z.coerce.number().int().positive().optional(),
  memoryKey: z.string().min(1).max(180),
  content: z.string().min(1).max(4_000),
  sensitivity: z.enum(['public', 'internal', 'confidential', 'restricted']),
  sourceType: z.string().min(1).max(80),
  validUntil: z.string().datetime().optional(),
});

/**
 * Propone un hecho para la memoria.
 *
 * Nace `proposed`: verificar es un acto aparte y con firma. `createAgentMemory`
 * valida el scope antes de escribir, así que un hecho de scope `user` sin
 * usuario se rechaza aquí y no en la constraint.
 */
export async function createMemoryAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'write');

  const parsed = memoriaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fallo(parsed.error.issues.map((i) => i.message).join('; '));
  }

  try {
    await createAgentMemory({
      scope: parsed.data.scope,
      scopeUserId: parsed.data.scopeUserId ?? null,
      agentId: parsed.data.agentId ?? null,
      memoryKey: parsed.data.memoryKey,
      content: parsed.data.content,
      sensitivity: parsed.data.sensitivity,
      sourceType: parsed.data.sourceType,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      createdByUserId: sesion.user.id,
    });
  } catch (err) {
    logRedacted('warn', '[agents] memoria rechazada:', err);
    return fallo('No se pudo guardar: revisa el scope.');
  }

  revalidatePath('/admin/agents/memory');
  return { ok: true, message: 'Propuesta guardada. Falta verificarla.' };
}

/**
 * Verifica un hecho.
 *
 * Exige `agents:approve`, no `write`: verificar es afirmar que algo es cierto, y
 * a partir de ahí el hecho entra en los prompts de los agentes.
 */
export async function verifyMemoryAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'approve');

  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  await verifyAgentMemory(parsed.data.id, sesion.user.id);
  logRedacted('info', `[agents] ${sesion.user.id} verificó la memoria ${parsed.data.id}`);
  revalidatePath('/admin/agents/memory');
  return { ok: true, message: 'Verificada.' };
}

/** Revoca sin borrar: la fila se conserva porque la auditoría también importa. */
export async function revokeMemoryAction(formData: FormData): Promise<ActionResult> {
  const sesion = await requirePermission('agents', 'approve');

  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fallo('Datos inválidos.');

  await revokeAgentMemory(parsed.data.id);
  logRedacted('info', `[agents] ${sesion.user.id} revocó la memoria ${parsed.data.id}`);
  revalidatePath('/admin/agents/memory');
  return { ok: true, message: 'Revocada. Deja de entrar en los prompts.' };
}
