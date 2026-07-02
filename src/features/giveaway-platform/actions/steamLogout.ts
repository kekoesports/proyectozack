'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Cierra la sesión del usuario Steam usando Better Auth y vuelve a la
 * plataforma pública en estado no-logueado.
 */
export async function steamLogout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect('/sorteos/plataforma');
}
