'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStudioAgency } from '@/lib/studio/access';
import { StudioInvitation, StudioReview, StudioId } from '@/lib/schemas/studio';
import { issueStudioInvitation } from '@/lib/studio/invitations';
import { reviewStudioProject, revokeStudioMember } from '@/lib/studio/agency';
import { StudioRenderReview } from '@/lib/schemas/studio-production';
import { reviewStudioRender } from '@/lib/studio/render-review';
import { z } from 'zod';
import { approveStudioNarration } from '@/lib/studio/narration-repository';
import { env } from '@/lib/env';

export async function authorizeStudioNarration(input: unknown) {
  const session = await requireStudioAgency();
  const parsed = z.object({ id: StudioId, creditsMilli: z.number().int().nonnegative().max(500000) }).safeParse(input);
  if (!parsed.success || !env.STUDIO_HIGGSFIELD_ENABLED) return { ok: false, error: 'Solicitud o conexión no válida.' };
  try {
    const ok = await approveStudioNarration(db, parsed.data.id, session.user.id, parsed.data.creditsMilli);
    revalidatePath('/admin/studio');
    return { ok, error: ok ? '' : 'El coste caducó, cambió o el guion ya es otra versión. Consulta un nuevo coste desde la pieza.' };
  } catch { return { ok: false, error: 'No se confirmó la aprobación. Revisa el estado antes de repetir.' }; }
}

export async function reviewStudioExport(input: unknown) {
  const session = await requireStudioAgency();
  const parsed = StudioRenderReview.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Añade la decisión y un comentario de revisión.' };
  try {
    const result = await reviewStudioRender(db, parsed.data, session.user.id);
    if (!result) return { ok: false, error: 'El montaje cambió o ya se revisó. No se aprobó una versión anterior.' };
    revalidatePath('/admin/studio'); revalidatePath(`/studio/projects/${result.projectId}`);
    return { ok: true, error: '' };
  } catch { return { ok: false, error: 'No se pudo guardar la revisión.' }; }
}

export async function inviteStudioCreator(input: unknown) {
  const session = await requireStudioAgency();
  const parsed = StudioInvitation.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: 'Revisa el talento y el correo.' };
  try {
    const token = await issueStudioInvitation(
      db,
      parsed.data.talentId,
      parsed.data.email,
      session.user.id,
    );
    return { ok: true as const, path: `/studio/access#${token}` };
  } catch {
    return { ok: false as const, error: 'No se pudo crear la invitación.' };
  }
}

export async function reviewStudioContent(input: unknown) {
  const session = await requireStudioAgency();
  const parsed = StudioReview.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Añade una decisión y un comentario.' };
  try {
    const ok = await reviewStudioProject(db, parsed.data, session.user.id);
    revalidatePath('/admin/studio');
    revalidatePath(`/studio/projects/${parsed.data.id}`);
    return {
      ok,
      error: ok ? '' : 'Esta versión ya cambió o no está en revisión.',
    };
  } catch {
    return { ok: false, error: 'No se pudo guardar la revisión.' };
  }
}

export async function revokeStudioAccess(input: unknown) {
  await requireStudioAgency();
  const parsed = StudioId.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Acceso no válido.' };
  try {
    const ok = await revokeStudioMember(db, parsed.data);
    revalidatePath('/admin/studio');
    return { ok, error: ok ? '' : 'Acceso no encontrado.' };
  } catch {
    return { ok: false, error: 'No se pudo revocar el acceso.' };
  }
}
