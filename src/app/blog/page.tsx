import type { Metadata } from 'next';
import { getPosts } from '@/lib/queries/posts';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { BlogCard } from '@/features/blog/components/BlogCard';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Marketing Gaming — Insights y Tendencias',
  description:
    'Estrategias de marketing gaming, análisis iGaming y guías para marcas que buscan streamers en España y LatAm. Publicado por la agencia SocialPro.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Marketing Gaming — Insights y Tendencias | SocialPro',
    description:
      'Estrategias de marketing gaming, análisis iGaming y guías para marcas que buscan streamers en España y LatAm.',
    url: absoluteUrl('/blog'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing Gaming — Insights y Tendencias | SocialPro',
    description:
      'Estrategias de marketing gaming y análisis iGaming para marcas que buscan streamers en España y LatAm.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <section className="bg-white pt-32 pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h1 className="sr-only">Marketing Gaming — Insights y Tendencias</h1>
        <SectionTag>Blog</SectionTag>
        <SectionHeading>Insights &amp; Tendencias</SectionHeading>
        <p className="text-sp-muted mt-3 mb-12 max-w-xl">
          Estrategias, análisis y guías sobre marketing gaming, esports y el ecosistema de creadores en español.
        </p>

        {posts.length === 0 ? (
          <p className="text-sp-muted text-center py-20">Próximamente nuevos artículos.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
