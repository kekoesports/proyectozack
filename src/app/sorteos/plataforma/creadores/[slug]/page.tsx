import { redirect } from 'next/navigation';

/**
 * Legacy redirect: `/sorteos/plataforma/creadores/[slug]` → `/sorteos/[slug]`.
 * Mantiene enlaces externos que aterricen en la URL antigua. El slug se
 * valida contra `PLATFORM_CREATOR_SLUGS` en la ruta canónica.
 */
export default async function LegacyCreadorRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/sorteos/${slug.toLowerCase().trim()}`);
}
