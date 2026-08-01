import { redirect } from 'next/navigation';

/**
 * Hub root for Finanzas. Sub-routes own the real UI; bare `/admin/finanzas`
 * must not 404 (nav bookmarks, revalidatePath targets, typed URLs).
 * Canonical landing matches the sidebar "Finanzas" entry → Resumen.
 */
export default function FinanzasIndexPage(): never {
  redirect('/admin/finanzas/resumen');
}
