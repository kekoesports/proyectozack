import { type NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { talentProfileEvents } from '@/db/schema/talentProfileEvents';
import { talents } from '@/db/schema/talents';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';

const bodySchema = z.object({ talentId: z.number().int().positive() });

const BOT_UA =
  /bot|crawl|spider|scraper|headless|python-requests|curl\/|wget\/|facebookexternalhit|twitterbot|whatsapp|telegram|discord|slackbot|linkedinbot|googlebot|bingbot|yandexbot|baidu|duckduckbot|semrushbot|ahrefsbot|mj12bot|screaming/i;

function isBot(ua: string): boolean {
  return !ua || BOT_UA.test(ua);
}

function parseDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function parseReferrer(referer: string | null): string | null {
  if (!referer) return null;
  try { return new URL(referer).hostname; } catch { return null; }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ua = req.headers.get('user-agent') ?? '';
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json() as unknown;
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return new NextResponse(null, { status: 400 });
    body = parsed.data;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { talentId } = body;
  const country       = req.headers.get('x-vercel-ip-country');
  const referer       = req.headers.get('referer');
  const ip            = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const today         = new Date().toISOString().slice(0, 10);
  const salt          = env.ANALYTICS_SALT ?? 'sp-analytics-v1-fallback';

  const sessionHash = createHash('sha256')
    .update(`${ip}:${ua}:${salt}:${today}`)
    .digest('hex')
    .slice(0, 64);

  const device       = parseDevice(ua);
  const referrerHost = parseReferrer(referer);

  after(async () => {
    try {
      const [talent] = await db.select({ id: talents.id }).from(talents).where(eq(talents.id, talentId)).limit(1);
      if (!talent) return;
      await db.insert(talentProfileEvents).values({
        talentId,
        action: 'view',
        sessionHash,
        country: country ?? null,
        referrerHost,
        device,
      }).onConflictDoNothing();
    } catch (err) {
      console.error('[talent-view] insert failed:', err);
    }
  });

  return new NextResponse(null, { status: 204 });
}
