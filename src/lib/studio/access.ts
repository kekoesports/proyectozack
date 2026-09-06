import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { requireAnyRole } from '@/lib/auth-guard';
import { createStudioRepository } from './repository';

export function requireStudioEnabled() {
  if (!env.STUDIO_ENABLED) notFound();
}

export async function requireStudioSession() {
  requireStudioEnabled();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/studio/login');
  return session;
}

export async function requireCreator() {
  const session = await requireStudioSession();
  const repository = createStudioRepository(db, session.user.id);
  const member = await repository.membership();
  if (!member) {
    if (session.user.role === 'admin' || session.user.role === 'manager') redirect('/admin/studio');
    redirect('/studio/access');
  }
  return { session, member, repository };
}

export async function requireStudioAgency() {
  requireStudioEnabled();
  return requireAnyRole(['admin', 'manager'], '/admin/login');
}
