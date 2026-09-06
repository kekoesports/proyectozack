'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStudioWriter, requireStudioSession } from '@/lib/studio/access';
import {
  StudioProjectInput,
  StudioTransition,
  StudioToken,
} from '@/lib/schemas/studio';
import { acceptStudioInvitation } from '@/lib/studio/invitations';

export async function saveStudioProject(input: unknown, update: boolean, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return { ok: false as const, error: 'El espacio cambió. Actualiza antes de guardar.' };
  const { repository } = actor;
  const parsed = StudioProjectInput.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: 'Revisa los campos del proyecto.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const data = parsed.data;
  try {
    const version = update ? StudioTransition.safeParse(input) : null;
    if (version && !version.success)
      return { ok: false as const, error: 'Versión no válida.' };
    const existing = version?.success ? version.data : undefined;
    const project = await repository.save(
      {
        title: data.title,
        template: data.template,
        platform: data.platform,
        brief: data.brief,
        script: data.script,
        cta: data.cta,
      },
      existing,
    );
    if (!project)
      return {
        ok: false as const,
        error:
          'No se puede guardar. Comprueba tu acceso, la versión actual o el límite piloto de 100 proyectos con tu agencia.',
      };
    revalidatePath('/studio');
    revalidatePath(`/studio/projects/${project.id}`);
    return { ok: true as const, id: project.id };
  } catch {
    return {
      ok: false as const,
      error: 'No se pudo guardar. Tu texto sigue en el editor.',
    };
  }
}

export async function submitStudioProject(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return { ok: false, error: 'El espacio cambió. Actualiza antes de enviar.' };
  const { repository } = actor;
  const parsed = StudioTransition.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Proyecto no válido.' };
  try {
    const result = await repository.submit(
      parsed.data.id,
      parsed.data.revision,
    );
    if (!result)
      return {
        ok: false,
        error: 'La versión cambió o no está disponible para revisión.',
      };
    revalidatePath('/studio');
    revalidatePath(`/studio/projects/${parsed.data.id}`);
    revalidatePath('/admin/studio');
    return { ok: true, error: '' };
  } catch {
    return { ok: false, error: 'No se pudo solicitar la revisión.' };
  }
}

export async function acceptStudioAccess(input: unknown) {
  const session = await requireStudioSession();
  if (!session.user.emailVerified)
    return {
      ok: false,
      error:
        'Verifica primero el correo de tu cuenta y vuelve a abrir tu invitación.',
    };
  const parsed = StudioToken.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invitación no válida.' };
  try {
    const ok = await acceptStudioInvitation(
      db,
      parsed.data,
      session.user.id,
      session.user.email,
    );
    return {
      ok,
      error: ok
        ? ''
        : 'La invitación no está disponible para esta cuenta, ha caducado o ya se ha utilizado.',
    };
  } catch {
    return { ok: false, error: 'No se pudo aceptar la invitación.' };
  }
}
