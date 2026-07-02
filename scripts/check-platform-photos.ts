import 'dotenv/config';
import { db } from '@/lib/db';
import { talents } from '@/db/schema/talents';
import { inArray } from 'drizzle-orm';

async function main() {
  const r = await db.query.talents.findMany({
    where: inArray(talents.slug, ['naow', 'huasopeek', 'martinez', 'zacketizor']),
    columns: { slug: true, name: true, photoUrl: true },
  });
  console.log(`Filas encontradas: ${r.length}`);
  for (const t of r) {
    console.log(`  ${t.slug} | ${t.name} | photoUrl=${t.photoUrl ? 'YES → ' + t.photoUrl.slice(0, 100) : 'NULL'}`);
  }
}
main().finally(() => process.exit(0));
