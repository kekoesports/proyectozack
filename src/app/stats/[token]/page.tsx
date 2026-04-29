import { notFound } from 'next/navigation';
import { getStatsRollupByToken } from '@/lib/queries/stats';
import { StatsView } from '@/features/talent-stats-public/components/StatsView';
import { env } from '@/lib/env';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

type Props = {
  readonly params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default async function StatsSharePage({ params }: Props): Promise<ReactElement> {
  const { token } = await params;
  const rollup = await getStatsRollupByToken(token);

  if (!rollup) notFound();

  return (
    <div className="min-h-screen bg-sp-admin-bg flex flex-col">
      <header className="border-b border-sp-admin-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display font-black tracking-widest text-sp-admin-text">
              SOCIALPRO<span className="text-sp-admin-accent">.</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sp-admin-muted">
              Stats
            </span>
          </div>
          <a
            href={env.NEXT_PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
          >
            socialpro.es
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-10 py-8">
        <StatsView data={rollup} title="SocialPro Stats" />
      </main>

      <footer className="border-t border-sp-admin-border">
        <p className="max-w-6xl mx-auto px-6 md:px-10 py-5 text-center text-xs text-sp-admin-muted/60">
          © SocialPro {new Date().getFullYear()} · Powered by SocialPro
        </p>
      </footer>
    </div>
  );
}
