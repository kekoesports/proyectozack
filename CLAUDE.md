# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Protocol

- Docs: honor `read_when` hints in `docs/` and distinguish dated history from current instructions and measured runtime state.
- Commits, when authorized: ordinary `git add` / `git commit` on named in-scope paths. Conventional Commits: `type(scope): message`. A documented command is not permission to execute it.
- Keep files <500 LOC; split when exceeded.

## Scope, approval and completion

- Apply the latest explicit user decision. An approval already given remains valid for the same action, scope, destination and effects; do not request it again merely because a session resumed or an older document says “pending approval”. Revalidate technical preconditions when state changes.
- New scope, recipients, data disclosure, spend, destructive effects or tool permission requirements still require their applicable authorization. Never bypass tool safeguards or turn a technical gate into blanket permission.
- Read-only diagnosis does not authorize edits. Once implementation is approved, diagnose → correct → verify → finish the authorized workflow; a blocked component must not stop safe, independent work.
- **Current internal-automation authorization (2026-09-05):** repair, configure, test and individually activate the SocialPro CRM ↔ n8n ↔ internal SocialPro Discord circuit, including an unmistakable synthetic TEST and replay of the same identity to verify idempotency. A safe workflow may remain active after its gates pass; no repeated approval for the same internal scope.
- Before activating each family, verify its current credential/destination, isolate excluded effects, use a fresh synthetic input, observe the persisted result and intended internal delivery/ACK, then replay the same identity and verify no duplicate effect. Message-driven channels must do nothing when there is no new message. Retain a reversible stop and do not replay history. If present in this checkout, `docs/stabilization-2026-09-05/workflow-reactivation-gates.md` supplies dated supporting evidence; its absence does not remove these gates or create a new approval requirement.
- That authorization excludes real invoices/payments/bank movements, destructive bank sync, customer emails/messages, influencer messages, contract changes, spend, amount/commercial-rule changes, bulk historical processing, historical dead-letter replay and deletion of history. Block or separate those effects in mixed workflows. Enable only demonstrably necessary workers/schedules, never all by default.
- Types/lint/build are engineering checks, not proof of a working product. For changed behavior, verify the affected user journey through its real boundaries or an explicitly isolated fixture, with negative/replay cases where relevant. State what was mocked, skipped or blocked. Documentation-only changes require reference/command/diff checks, not a fabricated runtime PASS.
- Report **IMPLEMENTED / TESTED / ACTIVE / FUNCTIONING** separately. For automations record the input identity, timestamps, processing, persisted result, delivery acceptance/ACK, duplicate check and latest useful operation without exposing secrets/PII. Container healthy, HTTP 200, a credential or local canary alone does not establish end-to-end success.
- A request to activate a workflow is not complete with a local preparation document. If a technical or permission blocker remains, name the exact blocked boundary and evidence; do not claim completion or a missing approval that has already been given.

## Session Continuity

- `/handoff`: record a dated handoff with completed work, evidence, permissions still in force and concrete next steps. `docs/handoff.md` currently records 2026-08-21 history; it is not today's activation or deployment authority.
- `/pickup`: follow `docs/pickup.md`; inspect the current checkout and the latest dated continuity/evidence available to the task. Do not replay historical merge, seed or activation instructions automatically.

## Project Overview

A Next.js 16 app for a gaming/esports talent agency (SocialPro). Read the relevant parts of `docs/roadmap-detailed.md` as dated history, not automatic work orders or current production evidence. Current user scope and dated operational evidence govern the task.

## Running the Project

```bash
npm run dev          # dev server (port 3000)
npm run build        # next build only; may read configured data during prerender
npm run lint         # eslint
npx tsc --noEmit     # type-check

# Database — commands are not authorization; verify target before any execution
npx drizzle-kit generate   # generate versioned SQL/snapshot files locally
npx drizzle-kit check      # check migration metadata; not a complete drift proof
npm run migrate           # apply versioned migrations via scripts/migrate.ts
# Seeds, sync jobs and extraction scripts write data/files; not routine validation.

# Tests
npm test                    # unit (jest)
npm run test:e2e            # playwright e2e
npm run test:coverage
```

## Next.js App Architecture

**Stack:** Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · Drizzle ORM · PostgreSQL · Better Auth · Resend · shadcn/ui · Zod v4 · react-hook-form · @vercel/blob. Provider/package presence does not identify the live database or authorize its use.

**Required env vars** (`.env.local`):
- `DATABASE_URL` — configured PostgreSQL connection; verify the environment/destination without displaying its value.
- `MIGRATION_DATABASE_URL` — optional DDL-role connection used by the migrator; never assume it targets the same DB without checking.
- `RESEND_API_KEY`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token. Requerido para upload/delete de archivos (GEO stats, facturas, contratos). Obtener en Vercel Dashboard → Storage → Blob → Token.

### Key directories

- `src/app/admin/` — CRM panel (auth-guarded; layouts, pages, Server Actions por módulo)
- `src/lib/` — `queries/`, `schemas/`, `permissions.ts`, `auth-guard.ts`, `env.ts`
- `src/db/schema/` — Drizzle schema files (fuente de verdad para nombres de columna y tipos)
- `src/types/` — exports `InferSelectModel` por entidad
- `src/components/` — `layout/` (Nav, Footer, PortalSidebar), `brand/`, `ui/`, `sections/`

### Server vs Client Component Rule

- **SERVER:** anything that only reads data (no onClick/useState/useEffect/scroll events)
- **CLIENT:** Nav, TalentGrid, TalentCard/Modal, ServicesSection (tabs), CaseCard, PortfolioGrid, ContactSection, FilterChips, ProposalModal, BrandTalentFichaClient
- **Data flow:** Server shell fetches all data → passes full array as prop to Client child → Client filters locally. No client-side DB calls ever.

### Database Schema Summary

Las definiciones exactas de columna están en `src/db/schema/` (fuente de verdad). Tablas:
- `talents`, `talent_tags`, `talent_stats`, `talent_socials`
- `testimonials`, `collaborators`, `team_members`, `brands`, `portfolio_items`
- `case_studies`, `case_body`, `case_tags`, `case_creators` (has `talent_id` FK)
- `contact_submissions`, `creator_applications`, `posts`
- `brand_campaigns`, `talent_proposals` (Growth G)
- Auth: `user` (with `role` text column), `session`, `account`, `verification`

Enums: `platform` (twitch|youtube), `status` (active|available), `portfolio_type` (thumb|video|campaign), `proposal_status` (pendiente|en_revision|aceptada|rechazada).

## CRM Modules (historial de desarrollo)

El panel `/admin/*` incluye roles, campañas, tareas recurrentes, finanzas (P&L, facturas) y buscador global. Las fases 1–6 se documentaron como desarrolladas el 26-04-2026; eso no acredita salud actual ni finalización de nuevas integraciones. Consultar el historial y verificar el recorrido afectado.

### Gotchas CRM
- Tokens en `globals.css @theme {}` — NO en `tailwind.config.ts` (no existe).
- `talentSocials.platform` usa claves cortas (`yt`, `tw`); `talentMetricSnapshots.platform` usa nombres completos (`youtube`, `twitch`).
- Un fallback legado de presentación como `parseFollowers("-")` no demuestra un cero observado. No convertir datos ausentes/ocultos/erróneos en métricas reales ni introducirlos en rankings.
- `invoice_status` incluye `cobrada` Y `pagada` (ambos = "settled income"). Queries P&L usan `IN ('cobrada','pagada')`.
- `campaigns.amountBrand/amountTalent` = presupuesto previsto, NO pagos reales. Pagos reales = `invoices` con `campaignId`.
- `crm_task_templates` tiene unique index en `title` — seed es idempotente.
- Cron semanal en `/api/cron/rollover-tasks` — rollover + regeneración recurrente de tareas.
- `files` tabla genérica en `src/db/schema/files.ts` — adjuntos polimórficos (facturas, GEO stats, contratos).
- Buscador global: `src/lib/queries/search.ts` + `/api/admin/search`. Visibility filter para staff.
- Migración 0003 tiene `CREATE TABLE` para tablas auth que pueden ya existir.
- Conservar `requireRole`/`requireAnyRole`, 2FA, permisos y validación de borrado. Las fixtures de test no autorizan un bypass de autenticación en la aplicación; probar auth real cuando corresponda.
- El migrador actual usa `pg` + `drizzle-orm/node-postgres`. La entrada soportada es `npm run migrate` (o su alias `migrate:deploy`), no `npx drizzle-kit migrate`, que omitiría los guards propios.

## Database Migrations

- **Drizzle is the single source of truth:** `src/db/schema/index.ts` → `npx drizzle-kit generate` → review SQL/snapshots/journal → isolated validation → `npm run migrate` only against the authorized destination. Commit reviewed migration files only when commits are in scope. Never create/alter schema through ad-hoc SQL, seeds or a provider console.
- `drizzle.config.ts` uses PostgreSQL, `src/db/schema/index.ts` and `drizzle/`; it requires `DATABASE_URL` in the process environment. Do not print credentials or assume the CLI automatically loads `.env.local`.
- `npm run migrate` and `npm run migrate:deploy` both run `tsx scripts/migrate.ts`: `pg` pool + Drizzle node-postgres migrator, loading missing values from `.env.local`, requiring `DATABASE_URL`, then preferring `MIGRATION_DATABASE_URL` for DDL. It checks migration timestamps against the DB journal before applying SQL.
- Preview migrations are skipped unless `RUN_MIGRATIONS_IN_PREVIEW=true`. `DEPLOY_ENV` takes precedence over `VERCEL_ENV`; the default `development` is **not** a migration kill switch. Verify resolved environment, DB, role, backup and rollback before applying anything; do not run a migration as a connectivity probe.
- `npx drizzle-kit check` validates metadata, not complete schema/SQL/snapshot equivalence or live state. Inspect this checkout's CI before assuming a generation-drift canary exists. Where configured, `generate --name=ci_drift_canary` must run on a backed-up disposable checkout and require no generated diff/prompts. Do not blindly commit generated SQL or modify history to make a check green.
- Before an authorized push, run `npx drizzle-kit check` with safe local configuration and resolve any failure; for schema changes also review the generated SQL/snapshots and isolated regression evidence. This preflight does not authorize the push or its hooks.
- `drizzle-kit push` is prohibited on persistent/staging/production DBs. The explicit exception is a verified empty disposable fixture. Some checkouts configure CI/Docker/E2E with PG17 and `npx drizzle-kit push --force`; verify the actual workflow, database and credentials before relying on that isolation. Such fixtures do **not** validate historical migration-chain bootstrap or permit pushing a real DB.
- Inspect `drizzle.__drizzle_migrations` and actual schema before claiming migrations are current. Missing/inconsistent metadata requires evidence-led reconciliation with its own authorized repair; never invent hashes or mark unapplied SQL applied.

### Commands and branch-specific checks (guidance updated: 2026-09-05)

| Environment | Existing command/path | Side effects and limit |
|---|---|---|
| Local build | `npm run build` → `next build` | No migration/IndexNow step; prerender can read configured DB/APIs, so use approved isolated values for QA. |
| Local migration | `npm run migrate` / `npm run migrate:deploy` | Both apply versioned SQL through `scripts/migrate.ts`; require destination approval and preflight. |
| Combined script | `npm run build:with-migrate` → `migrate:deploy` → `build` → `postdeploy` | Explicitly includes DDL and possible IndexNow request; not a harmless build check. |
| GitHub CI | Inspect `.github/workflows/ci.yml` in the current checkout: jobs, scripts, DB services, credential sources and skip conditions | Branches differ. Do not assume an ephemeral DB, synthetic secrets, a unit-test job or a mandatory build. `--passWithNoTests`, skipped steps and local results do not prove CI coverage or success. |
| GitHub E2E | Inspect `.github/workflows/e2e.yml`, its dispatch, DB setup and Playwright configuration in this checkout | Some branches apply migrations using configured secrets; others materialize disposable PG. Neither fixture auth nor green HTTP proves real authentication or delivery. Verify isolation before running. |
| Vercel config | `vercel.json` → `tsx scripts/migrate.ts && next build && tsx scripts/ping-indexnow.ts` | Uses migrator's preview guard; IndexNow requires resolved production and valid key/file. Inspect effective project/root/overrides before predicting any deployment. |
| Push hook | `.husky/pre-push` → `npm run sync:press` | Can write CRM data via its configured DB. Before an authorized push, inspect the effective hooks, destination and external effects; isolate excluded writes rather than treating a build as publication authority. If present, `docs/stabilization-2026-09-05/pr-publication-gate.md` is supporting evidence, not a prerequisite file or extra approval. |

Do not infer the current live pipeline from these files alone. This instruction update did not execute migrations, CI, hooks or deployment.

## CSS / Design System

**Brand tokens** definidos en `src/app/globals.css` dentro de `@theme {}` (este proyecto NO tiene `tailwind.config.ts` — Tailwind v4):
`sp-orange:#f5632a`, `sp-pink:#e03070`, `sp-dpink:#c42880`, `sp-purple:#8b3aad`, `sp-blue:#5b9bd5`, `sp-dark`, `sp-black`, `sp-muted`, `sp-border`, `sp-off`, `sp-bg2`.

**Fonts:** `font-display` = Barlow Condensed 800–900 uppercase; `font-body` = Inter.

**Gradient signature:** `bg-sp-grad` = `linear-gradient(135deg, #f5632a 0%, #e03070 35%, #c42880 62%, #8b3aad 100%)`. Use with restraint.

Complex CSS (marquee, gradient text, modals) stays in `globals.css` — do not force-migrate to Tailwind utilities.

## Design Context

The former `.impeccable.md` is absent. The published visual version is the reference; historical concepts are not active instructions.

**Brand:** Premium · Sharp · Credible. Spanish market, international ambition. Anti-pattern: neon-on-black gamer aesthetic.

**Principles:**
1. Credibility over hype — gradient is signature, not decoration
2. Creators are the product — foreground name, platform, numbers
3. Dark hero + light interior sections — alternating rhythm is intentional
4. Typography does the heavy lifting — Barlow Condensed IS the energy
5. Motion earns attention — remove it if it makes no difference

## Published design decision — definitive (2026-09-05)

- Preserve the currently published SocialPro visual concept. Do not continue SocialPro 2.0, SocialPro NEXT, new prototypes, rebranding, home redesign, new identity or artistic direction. Previous prototypes may remain archived, outside the active roadmap.
- Bugs, responsive behavior, accessibility, performance, inconsistencies, SEO, CRO, forms and objective visual errors may be corrected within the approved task **without changing that concept**. A design skill or historical roadmap does not reopen the decision.

## Change Order — affected layers only

- Validate dependencies from **DB → Query/API → Frontend**, changing only the layers actually affected. A UI bug with an unchanged contract does not require a new migration or query; documentation work does not require application changes.
- Before changing a query/data-dependent component, inspect the relevant `src/db/schema/` definitions and existing query/API contract. Never assume a column, enum, permission or returned field exists.
- When the contract changes, implement and validate schema first, query/API second, consumers last. Keep type and functional regression checks proportional to the changed boundaries.
- Never hardcode or invent follower counts. `scripts/sync-followers.ts` is a write-capable real-API sync, not a mandatory step of local QA; run it only within authorized scope. Use isolated fixtures for tests, preserve valid zero versus unavailable data, and label coverage/source limitations.

## TypeScript

- **Hard rules (siempre-on):** `.claude/rules/typescript.md` — 15 reglas no-negociables (tipado, boundary, auth, logs, React patterns, verificación).
- **Skill (bajo demanda):** skill `typescript-strict` — patrones detallados con código del proyecto, OWASP checklist, excepciones documentadas. Invocar al editar `.ts`/`.tsx`, Zod schemas o Server Actions.
- **ADR 0001** — `docs/adr/0001-zod-safeparse-at-boundaries.md` — por qué `safeParse` + `{ ok, fieldErrors }` y no `parse` + throw.
- **ADR 0002** — `docs/adr/0002-saneamiento-then-eslint-strict.md` — por qué sanear antes de activar ESLint estricto (ordering PRD 1 → 2 → 3).
- **ADR 0003** — `docs/adr/0003-react-stack-decisions.md` — reglas React adoptadas; Vite / TanStack Router / Redux descartados.
- **ADR 0004** — `docs/adr/0004-csrf-trust-next-defaults.md` — CSRF nativo de Next.js; no añadir middleware manual.

## Agent skills

### Issue tracker

Local markdown bajo `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Etiquetas canónicas sin renombrar (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `docs/adr/` for relevant decisions; see `docs/agents/domain.md`. Optional context files are not mandatory prerequisites when absent.
