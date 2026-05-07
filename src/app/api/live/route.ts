import { NextResponse } from 'next/server';
import { getLiveTalents, pickFeatured } from '@/lib/queries/live';

// Revalidar cada 60 segundos — fresco sin martillar la DB en cada render
export const revalidate = 60;

export async function GET(): Promise<NextResponse> {
  const lives = await getLiveTalents();
  const featured = pickFeatured(lives);
  const others = featured ? lives.filter((l) => l.talentId !== featured.talentId) : lives;

  return NextResponse.json({ featured, others, total: lives.length });
}
