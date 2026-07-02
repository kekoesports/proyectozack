import 'dotenv/config';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM "user")                                    AS users_total,
      (SELECT COUNT(*)::int FROM "account" WHERE "providerId"='steam')      AS accounts_steam,
      (SELECT COUNT(*)::int FROM "player_profiles")                         AS players_total,
      (SELECT COUNT(*)::int FROM "session" WHERE "expiresAt" > now())       AS sessions_active,
      (SELECT COUNT(*)::int FROM "user"    WHERE "createdAt" > now() - interval '2 hours') AS users_last_2h,
      (SELECT COUNT(*)::int FROM "session" WHERE "createdAt" > now() - interval '2 hours') AS sessions_last_2h
  `);
  const c = counts.rows[0] as {
    users_total: number; accounts_steam: number; players_total: number; sessions_active: number;
    users_last_2h: number; sessions_last_2h: number;
  };
  console.log('TOTALES:', c);

  const r = await db.execute(sql`
    SELECT s."createdAt" AS sc,
           u.email,
           u.role,
           (SELECT string_agg(a."providerId", ',') FROM "account" a WHERE a."userId"=u.id) AS providers
    FROM "session" s JOIN "user" u ON u.id = s."userId"
    WHERE s."expiresAt" > now()
    ORDER BY s."createdAt" DESC LIMIT 5
  `);
  console.log('\nÚLTIMAS 5 SESIONES ACTIVAS:');
  for (const row of r.rows) {
    const x = row as { sc: string; email: string; role: string | null; providers: string | null };
    const em = x.email ? `${x.email[0]}***@${x.email.split('@')[1]}` : '<null>';
    console.log(`  created=${x.sc} | email=${em} | role=${x.role ?? 'null'} | providers=${x.providers ?? '<none>'}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
