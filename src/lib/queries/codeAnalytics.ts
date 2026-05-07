import { eq, gt, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { codeClicks } from '@/db/schema/codeClicks';
import { creatorCodes } from '@/db/schema/creatorCodes';
import { talents } from '@/db/schema/talents';

export type CodeClickRow = {
  codeId: number;
  code: string;
  brandName: string;
  talentId: number;
  talentName: string;
  day: string;
  copies: number;
  ctas: number;
};

// Agrega clicks por (código, día) — últimos 90 días. El cliente filtra la ventana.
export async function getCodeClicksByDay(): Promise<CodeClickRow[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      codeId:     codeClicks.codeId,
      code:       creatorCodes.code,
      brandName:  codeClicks.brandName,
      talentId:   codeClicks.talentId,
      talentName: talents.name,
      day:        sql<string>`(${codeClicks.createdAt} AT TIME ZONE 'UTC')::date::text`,
      copies:     sql<number>`cast(count(*) filter (where ${codeClicks.action} = 'copy') as int)`,
      ctas:       sql<number>`cast(count(*) filter (where ${codeClicks.action} = 'cta') as int)`,
    })
    .from(codeClicks)
    .innerJoin(creatorCodes, eq(creatorCodes.id, codeClicks.codeId))
    .innerJoin(talents, eq(talents.id, codeClicks.talentId))
    .where(gt(codeClicks.createdAt, since))
    .groupBy(
      codeClicks.codeId,
      creatorCodes.code,
      codeClicks.brandName,
      codeClicks.talentId,
      talents.name,
      sql`(${codeClicks.createdAt} AT TIME ZONE 'UTC')::date`,
    )
    .orderBy(desc(sql`count(*)`));

  return rows;
}
