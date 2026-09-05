---
name: drizzle-safe-migrations
description: Production-safe Drizzle migration workflow for schema changes that require data backfills or constraint tightening. Use when changing enums/check constraints/defaults, removing status values, or sequencing custom and generated migrations in Drizzle. Trigger on requests about Drizzle migration safety, deployment-safe backfills, migration ordering, and rollback planning. Don't use for ORMs other than Drizzle, app-layer query optimization, or greenfield schema design.
metadata:
  author: Pedro Nauck
  github: https://github.com/pedronauck
  repository: https://github.com/pedronauck/skills
---
# Drizzle Safe Migrations

## Overview

Use this skill to run database migrations in a way that is auditable, deployment-safe, and consistent with Drizzle's migration model.

## Project command preflight

Before proposing or running commands, read the current `package.json`, `drizzle.config.ts`, `scripts/migrate.ts` and deployment entrypoint. Resolve paths from the repository root; do not assume a package manager, script alias or target database from this skill.

Verified SocialPro contract (2026-09-05): npm; generation uses `npx drizzle-kit generate`; `npm run migrate` and `npm run migrate:deploy` invoke `tsx scripts/migrate.ts` with `pg` / `drizzle-orm/node-postgres`. There is no `db:generate` or `typecheck` npm script. Recheck this contract if the files change.

- `drizzle.config.ts` requires an explicit `DATABASE_URL`, reads `src/db/schema/index.ts`, and writes `drizzle/`. Generation/check can use a synthetic local URL; they do not need production credentials.
- Applying migrations is separate: the runner loads `.env.local` without replacing existing environment values, requires `DATABASE_URL`, and prefers `MIGRATION_DATABASE_URL` for the connection. Verify the effective target privately, not just the shell's current directory.
- The runner skips only preview unless `RUN_MIGRATIONS_IN_PREVIEW=true`. `DEPLOY_ENV` precedes `VERCEL_ENV`; missing values default to development, which does **not** block applying migrations. Never rely on missing flags as a safety barrier.
- Apply only to the destination already authorized for the specific migration, after backup/restore, staging and rollback checks. A request to generate/review SQL does not authorize a production migration. Do not use `npx drizzle-kit migrate` as a substitute: it bypasses the project runner and its migration-skip guard.
- `drizzle-kit push` is limited to explicitly disposable test databases, never a production/staging repair. Those empty-schema tests do not validate the historical migration chain. Do not modify migration history or backfill the journal to manufacture a green result.

## Core Rules

- Always generate schema migrations with the inspected project command (currently `npx drizzle-kit generate`).
- Never hand-edit generated schema migration files.
- Generate data backfills as custom migrations (currently `npx drizzle-kit generate --custom --name <name>`) and edit only that custom SQL file.
- Apply data normalization before tightening constraints.
- Keep one-off data fixes in migration history, not as hidden runtime logic, unless an emergency hotfix requires temporary mitigation.

## Workflow

1. Classify the change:
   - `schema-only`: only column/table/index/default changes.
   - `data+schema`: old rows must be transformed before new constraints/defaults.
2. For `data+schema`, create custom migration first:
   - `npx drizzle-kit generate --custom --name <descriptive_name>`
   - Add idempotent backfill SQL.
3. Generate schema migration second:
   - `npx drizzle-kit generate`
4. Verify migration ordering in `drizzle/meta/_journal.json`:
   - backfill migration index must be lower than constraint-tightening migration index.
5. Verify generated SQL and snapshots:
   - backfill migration contains only intended data change.
   - schema migration contains constraint/default/type changes.
6. Run full backend verification:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test -- --runInBand`
   - `npx drizzle-kit check` validates migration metadata, not live schema equivalence; inspect generated SQL/snapshots and the intended database separately.
7. Document deployment notes:
   - expected data transformations,
   - lock-risk areas,
   - rollback strategy.

## Backfill Requirements

- Use restrictive `WHERE` clauses.
- Prefer idempotent updates (`UPDATE ... WHERE status = 'legacy_value'`).
- Do not mix unrelated DDL/DML in the same migration.
- Keep SQL explicit and minimal.

## Constraint Tightening Pattern

When removing allowed values (enum/check):

1. Backfill existing rows to valid target value.
2. Update default to new value.
3. Tighten check/enum constraint.

For large tables or strict uptime targets, use staged PostgreSQL patterns (`NOT VALID` + `VALIDATE CONSTRAINT`) where applicable.

## Anti-Patterns

- Hand-editing generated schema migration files.
- Tightening constraints before backfilling existing data.
- Hiding one-time migration logic in app startup code without migration artifacts.
- Running migrations without validating order in the Drizzle journal.

## Reference

- See `references/production-playbook.md` for command templates and review checklists.
