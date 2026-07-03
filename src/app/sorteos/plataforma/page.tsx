import { redirect } from 'next/navigation';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

/**
 * Compatibilidad legacy: `/sorteos/plataforma` (con o sin `?creador=…`) es
 * ahora un redirect a la nueva ruta canónica `/sorteos` o
 * `/sorteos/[creatorSlug]`. Preserva enlaces externos que apunten a la
 * URL antigua.
 */
export default async function LegacyPlataformaRedirect({
  searchParams,
}: {
  searchParams: Promise<{ creador?: string }>;
}) {
  const { creador } = await searchParams;
  const slug = creador?.toLowerCase().trim() ?? '';
  if (slug && PLATFORM_CREATOR_SLUGS.includes(slug as (typeof PLATFORM_CREATOR_SLUGS)[number])) {
    redirect(`/sorteos/${slug}`);
  }
  redirect('/sorteos');
}
