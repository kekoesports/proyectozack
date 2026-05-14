# Incident: Drizzle Migration Tracker — 2026-05-14

**Severity:** P1 — 3 production deploys failed, master broken  
**Duration:** ~90 minutes  
**Affected:** All Vercel deploys of master after commit `349626c`  
**Resolved by:** `9f73951` (DB operation, empty commit to trigger redeploy)

---

## Timeline

| Time | Event |
|------|-------|
| ~14:28 | Migration `0072_graceful_blizzard.sql` generated via `drizzle-kit generate` |
| ~14:29 | Columns `is_published`/`show_in_roster` added to Neon **manually** (bypassing `npm run migrate`) |
| ~14:34 | `349626c` pushed to master → Vercel deploy starts |
| ~14:34 | Deploy fails: `Migration failed: ALTER TABLE "talents" ADD COLUMN "is_published"` |
| ~14:55 | Two more commits pushed (ad4d79d, bde6b21) — both fail for the same reason |
| ~16:25 | Root cause identified: wrong migration tracker table |
| ~16:35 | 49 hashes inserted into `drizzle.__drizzle_migrations` (correct table) |
| ~16:37 | `npm run migrate` → `Done.` locally |
| ~16:37 | `9f73951` empty commit pushed → Vercel deploy |
| ~16:44 | Deploy `dpl_Ey3QaPJNuJfD8cbKhyeJb6mQ63mA` → **READY** |

---

## Root Cause

The Drizzle `neon-http` migrator determines which migrations to run **exclusively by timestamp**, not by hashing:

```javascript
// drizzle-orm/neon-http/migrator (simplified)
const lastDbMigration = await db.select(
  'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1'
);
for (const migration of allMigrations) {
  if (!lastDbMigration || lastDbMigration.created_at < migration.folderMillis) {
    await runMigration(migration.sql);
    await insertHash(migration.hash, migration.folderMillis);
  }
}
```

Two mistakes combined to produce the failure:

### Mistake 1 — DDL applied manually before deploy

The columns `is_published` and `show_in_roster` were added directly to Neon via a Node.js script, bypassing `npm run migrate`. When Vercel ran the build, `npm run migrate` found migration `0072` untracked and tried to `ALTER TABLE ADD COLUMN` → columns already existed → **ERROR**.

### Mistake 2 — Wrong migration tracker table

During the recovery attempt, the hash for `0072_graceful_blizzard` was registered in `public.__drizzle_migrations`. But the migrator uses `drizzle.__drizzle_migrations` (schema `drizzle`, not `public`). The manual fix went to the wrong table and had no effect.

### Why previous migrations didn't fail

Migrations 0020–0071 had also been applied manually (months earlier) without being registered in `drizzle.__drizzle_migrations`. However, those migrations were `CREATE TABLE IF NOT EXISTS` statements — idempotent. Re-running them silently succeeded. Migration 0072 used `ALTER TABLE ADD COLUMN` which is **not idempotent** and failed.

---

## Fix Applied

DB operation (not code change):

```javascript
// Inserted 49 missing SHA256 hashes into drizzle.__drizzle_migrations
// with timestamps from drizzle/meta/_journal.json
// max(created_at) after fix: 1778768943749
// max(journal.when) for 0072: 1778765353477
// Result: migrator skips all current migrations on next run
```

```sql
-- Simplified equivalent of what was done
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT sha256(file_content), journal_when
FROM migration_files
WHERE sha256(file_content) NOT IN (
  SELECT hash FROM drizzle.__drizzle_migrations
);
```

Verified locally: `npm run migrate` → `Applying migrations from ./drizzle ... Done.`

---

## Rules Going Forward

### Never apply DDL/DML manually in production without registering the migration

If you ever need to run SQL directly in Neon (emergency, partial fix, etc.):

1. Run the SQL in Neon console or via script
2. Immediately register the migration's SHA256 and timestamp in `drizzle.__drizzle_migrations`:

```javascript
// After applying migration file 0073_example.sql manually:
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const content = readFileSync('./drizzle/0073_example.sql', 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
const when = journal.entries.find(e => e.tag === '0073_example').when;

await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${when})`;
```

3. Run `npm run migrate` locally to confirm it says `Done.` without errors

### Correct migration tracker table

```
drizzle.__drizzle_migrations   ← CORRECT (used by the migrator)
public.__drizzle_migrations    ← WRONG (also exists but not read by migrator)
```

Always verify in `drizzle.__drizzle_migrations`, not `public.__drizzle_migrations`.

### Verify after every manual DB operation

```bash
npm run migrate
# Must output: "Applying migrations from ./drizzle ... Done."
# If it tries to run SQL: something is unregistered
```

---

## Prevention Checklist

Before pushing a commit with a new migration:

- [ ] `npm run migrate` runs cleanly locally (`Done.` with 0 SQL executed)
- [ ] No columns/tables from this migration were added manually to DB
- [ ] If they were: register the SHA256 hash in `drizzle.__drizzle_migrations` first
- [ ] Check `drizzle.__drizzle_migrations` — not `public.__drizzle_migrations`

---

## References

- Failing deploys: `349626c`, `ad4d79d`, `bde6b21`
- Fix commit: `9f73951`
- Drizzle migrator source: `node_modules/drizzle-orm/neon-http/migrator.cjs`
- Migration file: `drizzle/0072_graceful_blizzard.sql`
