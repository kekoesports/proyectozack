# Drizzle Production Migration Playbook

## Decision Tree

- If no existing data can violate new constraints: use generated schema migration only.
- If existing data may violate new constraints: use custom backfill migration first, then generated schema migration.

## Command Sequence

Run from the repository root after inspecting `package.json`, `drizzle.config.ts` and `scripts/migrate.ts` (see the skill's project preflight). Commands below match SocialPro on 2026-09-05; do not invent `db:generate`/`typecheck` aliases. The config requires `DATABASE_URL` even for local generation/check: use an explicitly supplied synthetic URL for those steps rather than loading production credentials.

```bash
# 1) Create custom backfill migration
npx drizzle-kit generate --custom --name <backfill_name>

# 2) Edit generated custom file in drizzle/
# Example: drizzle/0014_<backfill_name>.sql

# 3) Generate schema migration
npx drizzle-kit generate

# 4) Check metadata and the application (not proof of live schema parity)
npx drizzle-kit check
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Applying is a separate, authorized step: `npm run migrate` (alias `npm run migrate:deploy`) uses the project's node-postgres runner and migration-skip guard. Never run it merely to inspect state. The runner may load `.env.local`; it requires `DATABASE_URL` and then prefers `MIGRATION_DATABASE_URL`. Confirm the effective database privately and do not print its credentials.

Only preview is skipped by default (`DEPLOY_ENV` before `VERCEL_ENV`); `RUN_MIGRATIONS_IN_PREVIEW=true` overrides that skip. Missing environment flags are **not** a production protection. Inspect the actual deployment command too: a combined build/deploy can apply migrations or trigger external publication hooks, so generation/review authority alone does not authorize it.

## Example Backfill SQL

Illustrative only: inspect the actual schema and affected rows before authoring a custom migration; do not execute this example against project data.

```sql
UPDATE "tasks"
SET "status" = 'pending'
WHERE "status" = 'saved';
```

## Migration Review Checklist

- Backfill migration is ordered before schema-tightening migration.
- Custom migration changes only the intended rows.
- Schema migration removes legacy values from constraints/enums.
- Defaults reflect the new target value.
- `drizzle/meta/_journal.json` and snapshots are present.

## Deployment Checklist

- Confirm backups/snapshots are available.
- Confirm the specific destination/change is authorized, recovery is usable and effective environment/credential sources match that destination. Do not ask again for authority that already clearly covers the same action; unresolved target/scope or a new sensitive action still blocks application.
- Apply migrations in order in staging first.
- Validate row counts before and after backfill.
- Run app smoke checks after migration.
- Use the versioned project runner, not `drizzle-kit migrate` or ad-hoc SQL. `push` is allowed only for explicitly disposable fixtures; it cannot validate migration history or repair production/staging drift.
- If the migration-skip guard or journal disagrees with the database, investigate and document reconciliation first. Do not rewrite applied SQL, hashes or timestamps merely to bypass the failure.

## Rollback Strategy

- Prefer forward-fix migrations instead of editing old migration files.
- If rollback is necessary, add a new migration that reintroduces valid compatibility states.
