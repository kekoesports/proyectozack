import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { newsAlerts } from '@/db/schema';
import { env } from '@/lib/env';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { cleanupOldNewsAlerts } from '@/lib/queries/newsAlerts';

export const dynamic = 'force-dynamic';

// ── Keyword groups ───────────────────────────────────────────────────────────

type Group = {
  readonly key: string;
  readonly category: 'regulatory' | 'competitor' | 'brand' | 'sector' | 'own';
  readonly priority: 'high' | 'medium' | 'low';
  readonly q: string;
  readonly language: string;
};

const QUERY_GROUPS: readonly Group[] = [
  {
    key: 'regulatory',
    category: 'regulatory',
    priority: 'high',
    q: 'DGOJ OR "publicidad juego online" OR "Real Decreto 958"',
    language: 'es',
  },
  {
    key: 'competitor',
    category: 'competitor',
    priority: 'medium',
    q: '"MCR Agency" OR "Infinity Talent" OR "agencia gaming" OR "agencia iGaming"',
    language: 'es',
  },
  {
    key: 'brand',
    category: 'brand',
    priority: 'medium',
    q: 'KeyDrop OR Hellcase OR 1xBet OR PlayUZU OR "iGaming España"',
    language: 'es',
  },
  {
    key: 'sector-igaming',
    category: 'sector',
    priority: 'medium',
    q: 'casino online OR apuestas deportivas OR influencer iGaming OR CNMC juego',
    language: 'es',
  },
  {
    key: 'sector-cs2',
    category: 'sector',
    priority: 'high',
    q: '"Counter-Strike 2" OR CS2 OR "BLAST Premier" OR "ESL Counter-Strike" OR PGL',
    language: 'es',
  },
  {
    key: 'own',
    category: 'own',
    priority: 'low',
    q: 'SocialPro OR "socialpro.es"',
    language: 'es',
  },
] as const;

// ── NewsData.io API types ────────────────────────────────────────────────────

type NewsDataArticle = {
  article_id: string;
  title: string;
  link: string;
  source_id?: string;
  source_name?: string;
  description?: string | null;
  content?: string | null;
  pub_date?: string | null;
  image_url?: string | null;
  language?: string | null;
};

type NewsDataResponse = {
  status: string;
  results?: NewsDataArticle[];
  message?: string;
};

// ── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchGroup(apiKey: string, group: Group): Promise<NewsDataArticle[]> {
  // timeframe y from_date requieren plan de pago en NewsData.io.
  // En plan gratuito, la API devuelve los artículos más recientes disponibles.
  // La deduplicación por external_id (MD5 de URL) evita duplicados entre runs.
  const params = new URLSearchParams({
    apikey: apiKey,
    q: group.q,
    language: group.language,
    size: '10',
  });

  const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`, {
    headers: { 'User-Agent': 'SocialPro/1.0' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.warn(`[sync-news-alerts] NewsData HTTP ${res.status} for group ${group.key}`);
    return [];
  }

  // safe: input comes from NewsData.io API, validated by shape checks below
  const data = await res.json() as NewsDataResponse;

  if (data.status !== 'success') {
    console.warn(`[sync-news-alerts] NewsData error for ${group.key}:`, data.message);
    return [];
  }

  return data.results ?? [];
}

// ── Upsert ───────────────────────────────────────────────────────────────────

async function upsertArticle(article: NewsDataArticle, group: Group): Promise<boolean> {
  if (!article.link || !article.title) return false;

  const externalId = createHash('md5').update(article.link).digest('hex').slice(0, 64);
  const snippet = (article.description ?? article.content ?? '').slice(0, 300) || null;

  try {
    const rows = await db
      .insert(newsAlerts)
      .values({
        externalId,
        title: article.title.slice(0, 500),
        sourceName: article.source_name?.slice(0, 200) ?? null,
        sourceUrl: article.link,
        snippet,
        imageUrl: article.image_url?.slice(0, 500) ?? null,
        keywordsMatched: [group.key, group.category],
        category: group.category,
        priority: group.priority,
        language: article.language?.slice(0, 5) ?? group.language,
        publishedAt: article.pub_date ? new Date(article.pub_date) : null,
      })
      .onConflictDoNothing({ target: newsAlerts.externalId })
      .returning({ id: newsAlerts.id });
    // rows.length === 0 → conflicto (ya existía), no insertado
    return rows.length > 0;
  } catch (err) {
    console.warn('[sync-news-alerts] upsert failed:', err);
    return false;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const apiKey = env.NEWSDATA_API_KEY;
  if (!apiKey) {
    console.warn('[sync-news-alerts] NEWSDATA_API_KEY not configured — skipping');
    return NextResponse.json({ success: false, error: 'NEWSDATA_API_KEY not configured' }, { status: 503 });
  }

  const results: Record<string, number> = {};
  let totalInserted = 0;

  for (const group of QUERY_GROUPS) {
    const articles = await fetchGroup(apiKey, group);
    let inserted = 0;
    for (const article of articles) {
      if (await upsertArticle(article, group)) inserted++;
    }
    results[group.key] = inserted;
    totalInserted += inserted;
  }

  // Limpieza de alertas antiguas según política de retención
  const { deleted } = await cleanupOldNewsAlerts();

  console.info(`[sync-news-alerts] inserted=${totalInserted} deleted=${deleted}`, results);

  return NextResponse.json({
    success: true,
    inserted: totalInserted,
    deleted,
    byCategory: results,
  });
}
