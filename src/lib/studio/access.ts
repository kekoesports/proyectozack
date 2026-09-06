import 'server-only';
import { headers, cookies } from 'next/headers';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { requireAnyRole } from '@/lib/auth-guard';
import { createStudioRepository } from './repository';
import { createProductionRepository } from './production-repository';
import { createNarrationRepository } from './narration-repository';
import { createChannelRepository } from './channel-repository';
import { STUDIO_WORKSPACE_COOKIE } from './talent-scope';
import { StudioTalentId } from '@/lib/schemas/studio';

export function requireStudioEnabled() {
  if (!env.STUDIO_ENABLED) notFound();
}

export async function requireStudioSession() {
  requireStudioEnabled();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/studio/login');
  return session;
}

export const requireCreator = cache(async () => {
  const session = await requireStudioSession();
  const isAgency = session.user.role === 'admin' || session.user.role === 'manager';
  const selected = StudioTalentId.safeParse((await cookies()).get(STUDIO_WORKSPACE_COOKIE)?.value);
  const agencyTalentId = isAgency && selected.success ? selected.data : undefined;
  if (agencyTalentId !== undefined) await requireStudioAgency();
  const repository = createStudioRepository(db, session.user.id, agencyTalentId);
  const member = await repository.membership();
  if (!member) {
    if (session.user.role === 'admin' || session.user.role === 'manager') redirect('/admin/studio');
    redirect('/studio/access');
  }
  return { session, member, repository, agencyTalentId,
    production: createProductionRepository(db, session.user.id, agencyTalentId),
    narrations: createNarrationRepository(db, session.user.id, agencyTalentId),
    channels: createChannelRepository(db, session.user.id, agencyTalentId),
  };
});

/** An old tab must not write into a workspace selected later in another tab. */
export async function requireStudioWriter(expectedWorkspace: unknown) {
  const actor = await requireCreator();
  const expected = StudioTalentId.safeParse(expectedWorkspace);
  if (!expected.success || expected.data !== actor.member.talentId) return null;
  return actor;
}

export async function requireStudioAgency() {
  requireStudioEnabled();
  return requireAnyRole(['admin', 'manager'], '/admin/login');
}
