'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/site-url';
import { requireStudioAgency } from '@/lib/studio/access';
import { createStudioRepository } from '@/lib/studio/repository';
import { STUDIO_WORKSPACE_COOKIE } from '@/lib/studio/talent-scope';
import { StudioTalentId } from '@/lib/schemas/studio';

export async function openStudioWorkspace(input: unknown) {
  const session = await requireStudioAgency();
  const parsed = StudioTalentId.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Talento no válido.' };
  try {
    const member = await createStudioRepository(db, session.user.id, parsed.data).membership();
    if (!member) return { ok: false, error: 'Espacio no disponible para esta cuenta.' };
    (await cookies()).set(STUDIO_WORKSPACE_COOKIE, String(member.talentId), {
      httpOnly: true, secure: SITE_URL.startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 3600 * 8,
    });
    return { ok: true, error: '' };
  } catch { return { ok: false, error: 'No se pudo abrir el espacio.' }; }
}

export async function leaveStudioWorkspace() {
  await requireStudioAgency();
  (await cookies()).delete(STUDIO_WORKSPACE_COOKIE);
  redirect('/admin/studio');
}
