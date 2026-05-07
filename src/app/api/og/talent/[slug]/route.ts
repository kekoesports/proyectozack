import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentSocials, creatorCodes, giveaways } from '@/db/schema';

export const dynamic = 'force-dynamic';

export type OgTalentData = {
  name: string;
  role: string;
  game: string;
  initials: string;
  photoUrl: string | null;
  gradientC1: string;
  gradientC2: string;
  codeCount: number;
  activeGiveawayCount: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const [talentRows, codeRows, giveawayRows] = await Promise.all([
    db.select({
      name: talents.name,
      role: talents.role,
      game: talents.game,
      initials: talents.initials,
      photoUrl: talents.photoUrl,
      gradientC1: talents.gradientC1,
      gradientC2: talents.gradientC2,
    })
    .from(talents)
    .where(eq(talents.slug, slug))
    .limit(1),

    db.select({ id: creatorCodes.id })
      .from(creatorCodes)
      .innerJoin(talents, eq(talents.id, creatorCodes.talentId))
      .where(eq(talents.slug, slug)),

    db.select({ id: giveaways.id })
      .from(giveaways)
      .innerJoin(talents, eq(talents.id, giveaways.talentId))
      .where(eq(talents.slug, slug)),
  ]);

  const talent = talentRows[0];
  if (!talent) return NextResponse.json(null, { status: 404 });

  const now = new Date();
  const activeGiveawayCount = giveawayRows.length; // simplified count

  const data: OgTalentData = {
    ...talent,
    codeCount: codeRows.length,
    activeGiveawayCount,
  };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
