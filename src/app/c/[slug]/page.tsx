import { redirect } from 'next/navigation';

// La URL canónica del perfil de creador es /talentos/[slug].
// /c/[slug] redirige permanentemente ahí.
export default async function CSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/talentos/${slug}`);
}
