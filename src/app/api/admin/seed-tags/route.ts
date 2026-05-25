import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents, talentTags } from '@/db/schema';

// Fuente de verdad de etiquetas — huasopeek sin Valorant (es jugador de CS2)
const TALENT_TAGS: Record<string, string[]> = {
  todocs2:      ['CS2', 'FPS Competitivo', 'Twitch', 'España'],
  deqiuv:       ['CS2', 'Valorant', 'FPS', 'Twitch'],
  adams:        ['YouTube', 'Gaming', 'FPS', 'Contenido'],
  mecha:        ['CS2', 'Esports', 'Competitivo', 'Twitch'],
  huasopeek:    ['CS2', 'LatAm', 'Twitch', 'FPS'],
  rinna:        ['Gaming', 'Lifestyle', 'YouTube', 'Twitch'],
  martinez:     ['Esports', 'Variety', 'Twitch', 'Competitivo'],
  vityshow:     ['Gaming', 'Twitch', 'Disponible'],
  sofffi:       ['CS2', 'FPS', 'Twitch'],
  naow:         ['Gaming', 'YouTube', 'Variety'],
  yamisanchezz: ['CS2', 'FPS', 'Twitch'],
  eruby:        ['CS2', 'YouTube', 'Skins', 'Gaming'],
};

export async function POST() {
  await requirePermission('talentos', 'write');

  const results: { slug: string; name: string; tags: string[]; ok: boolean }[] = [];

  for (const [slug, tags] of Object.entries(TALENT_TAGS)) {
    const talent = await db.query.talents.findFirst({
      where: eq(talents.slug, slug),
      columns: { id: true, name: true },
    });

    if (!talent) {
      results.push({ slug, name: slug, tags, ok: false });
      continue;
    }

    await db.delete(talentTags).where(eq(talentTags.talentId, talent.id));
    await db.insert(talentTags).values(tags.map((tag) => ({ talentId: talent.id, tag })));
    revalidatePath(`/talentos/${slug}`);
    results.push({ slug, name: talent.name, tags, ok: true });
  }

  revalidatePath('/talentos');
  return NextResponse.json({ results });
}
