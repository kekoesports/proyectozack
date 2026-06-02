import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import {
  getTopPostsByViews,
  getPostViewsByDay,
  getTopTagsByViews,
  getTalentsByArticleViews,
  getTopBrandsByViews,
  getViewsByCountry,
  getPostViewsByMonth,
} from '@/lib/queries/postAnalytics';
import { PostNewsAnalyticsDashboard } from '@/features/admin/analytics/components/PostNewsAnalyticsDashboard';

export const metadata = { title: 'Analítica Editorial | Admin' };

export default async function PostAnalyticsPage(): Promise<React.ReactElement> {
  await requirePermission('analytics', 'read');

  const [topAll, viewsByDay, topTags, talentRanking, brandRanking, countryViews, monthlyViews] = await Promise.all([
    getTopPostsByViews('all', 50),
    getPostViewsByDay(30),
    getTopTagsByViews('all', 30),
    getTalentsByArticleViews(30),
    getTopBrandsByViews(30),
    getViewsByCountry(30),
    getPostViewsByMonth(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/analytics" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors">
          ← Analítica
        </Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="text-xl font-bold text-sp-admin-text leading-none">Editorial</h1>
      </div>

      <PostNewsAnalyticsDashboard
        topPosts={topAll}
        viewsByDay={viewsByDay}
        topTags={topTags}
        talentRanking={talentRanking}
        brandRanking={brandRanking}
        countryViews={countryViews}
        monthlyViews={monthlyViews}
      />
    </div>
  );
}
