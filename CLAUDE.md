# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Protocol
- Docs: run `scripts/docs-list` before deep work; honor `read_when` hints.
- Commit helper: `scripts/committer "type(scope): message" file1 file2`.
- Keep files <500 LOC; split when exceeded.

## Session Continuity
- `/handoff`: read `docs/handoff.md` — dump state for next session.
- `/pickup`: read `docs/pickup.md` — rehydrate context when starting.

## Project Overview

A Next.js 16 app for a gaming/esports talent agency (SocialPro). All code lives at the repo root. The migration plan and phase tracking live in `roadmap.md`. Read it before any work.

## Running the Project

```bash
npm run dev          # dev server (port 3000)
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # type-check

# Database
npx drizzle-kit generate   # generate migration SQL
npx drizzle-kit migrate    # run migrations against DATABASE_URL
npx tsx scripts/seed.ts    # seed data (run after extract-images.mjs)
node scripts/extract-images.mjs  # extract base64 images from HTML → public/images/

# Tests
npm test                    # unit (jest)
npm run test:e2e            # playwright e2e
npm run test:coverage
```

## Next.js App Architecture

**Stack:** Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · Drizzle ORM · Neon Postgres · Better Auth · Resend · shadcn/ui · Zod v4 · react-hook-form · @vercel/blob

**Required env vars** (`.env.local`):
- `DATABASE_URL` — Neon connection string
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

See `roadmap.md` Phase 2 for exact column definitions. Tables:
- `talents`, `talent_tags`, `talent_stats`, `talent_socials`
- `testimonials`, `collaborators`, `team_members`, `brands`, `portfolio_items`
- `case_studies`, `case_body`, `case_tags`, `case_creators` (has `talent_id` FK)
- `contact_submissions`, `creator_applications`, `posts`
- `brand_campaigns`, `talent_proposals` (Growth G)
- Auth: `user` (with `role` text column), `session`, `account`, `verification`

Enums: `platform` (twitch|youtube), `status` (active|available), `portfolio_type` (thumb|video|campaign), `proposal_status` (pendiente|en_revision|aceptada|rechazada).

## CRM Modules (Fases 1–6 — completadas 26-04-2026)

El panel `/admin/*` es un CRM operativo completo con roles, campañas, tareas recurrentes, finanzas (P&L, facturas) y buscador global. Ver `git log` para historial de fases.

### Gotchas CRM
- Tokens en `globals.css @theme {}` — NO en `tailwind.config.ts` (no existe).
- `talentSocials.platform` usa claves cortas (`yt`, `tw`); `talentMetricSnapshots.platform` usa nombres completos (`youtube`, `twitch`).
- `parseFollowers("-")` debe retornar 0.
- `invoice_status` incluye `cobrada` Y `pagada` (ambos = "settled income"). Queries P&L usan `IN ('cobrada','pagada')`.
- `campaigns.amountBrand/amountTalent` = presupuesto previsto, NO pagos reales. Pagos reales = `invoices` con `campaignId`.
- `crm_task_templates` tiene unique index en `title` — seed es idempotente.
- Cron semanal en `/api/cron/rollover-tasks` — rollover + regeneración recurrente de tareas.
- `files` tabla genérica en `src/db/schema/files.ts` — adjuntos polimórficos (facturas, GEO stats, contratos).
- Buscador global: `src/lib/queries/search.ts` + `/api/admin/search`. Visibility filter para staff.
- Migración 0003 tiene `CREATE TABLE` para tablas auth que pueden ya existir.
- Dev auth bypass: `requireRole()` retorna mock session — probar auth real en staging.
- `npm run migrate` usa `neon-http` (correcto). NO usar `npx drizzle-kit migrate` (usa websockets y cuelga).

## Database Migrations
- **Drizzle is the single source of truth.** Never create tables or alter columns via raw SQL, seed scripts, or the Neon console. All schema changes go through `npx drizzle-kit generate` → `npm run migrate`.
- **`drizzle-kit push` está prohibido** salvo entornos temporales/desechables. Siempre generar migration SQL versionado.
- **Flujo obligatorio:** editar `src/db/schema/` → `npx drizzle-kit generate` → `npm run migrate` → commit del SQL generado.
- **Pre-push check:** correr `npx drizzle-kit check` antes de hacer push. Si falla, hay cambios en el schema sin migration — generarla antes de continuar.
- **El build de Vercel incluye `npm run migrate`** (ver `package.json`) — las migraciones se aplican automáticamente en producción en cada deploy.
- **Verify `__drizzle_migrations` exists** before assuming migrations are current. If it's missing, the DB was provisioned outside Drizzle and must be reconciled before any new migration work.
- **After applying migrations manually** (to fix drift), always backfill the `__drizzle_migrations` table with the correct hashes so future `drizzle-kit migrate` runs are idempotent.
- **Incidente 2026-05-06:** `crm_alerts` fue creada via `drizzle-kit push` sin migration file → producción no tenía la tabla → error 500. Evitar esta situación con `drizzle-kit check` en CI.

## CSS / Design System

**Brand tokens** defined in `tailwind.config.ts` under `theme.extend.colors`:
`sp-orange:#f5632a`, `sp-pink:#e03070`, `sp-dpink:#c42880`, `sp-purple:#8b3aad`, `sp-blue:#5b9bd5`, `sp-dark`, `sp-black`, `sp-muted`, `sp-border`, `sp-off`, `sp-bg2`.

**Fonts:** `font-display` = Barlow Condensed 800–900 uppercase; `font-body` = Inter.

**Gradient signature:** `bg-sp-grad` = `linear-gradient(135deg, #f5632a 0%, #e03070 35%, #c42880 62%, #8b3aad 100%)`. Use with restraint.

Complex CSS (marquee, gradient text, modals) stays in `globals.css` — do not force-migrate to Tailwind utilities.

## Design Context

Full context in `.impeccable.md`. Summary:

**Brand:** Premium · Sharp · Credible. Spanish market, international ambition. Anti-pattern: neon-on-black gamer aesthetic.

**Principles:**
1. Credibility over hype — gradient is signature, not decoration
2. Creators are the product — foreground name, platform, numbers
3. Dark hero + light interior sections — alternating rhythm is intentional
4. Typography does the heavy lifting — Barlow Condensed IS the energy
5. Motion earns attention — remove it if it makes no difference

## Change Order — Bottom-Up (STRICT)

**Always implement in this order: DB → Query/API → Frontend. Never the reverse.**

Violating this order breaks something every time:
- Writing frontend before the query exists → TypeScript errors, shape mismatches
- Writing a query before the schema exists → runtime errors, wrong column names
- Assuming a column/table exists without reading the schema → silent bugs

Rules:
1. **Schema first.** Read `db/schema/` before touching any query or component. Verify column names, types, and relations exist before using them.
2. **Query second.** Write or update `lib/queries/` after schema is confirmed. Run `npx tsc --noEmit` to verify types.
3. **Frontend last.** Only build components after the data shape is proven correct end-to-end.
4. **`followers_display` values come from `scripts/sync-followers.ts`.** Never hardcode follower counts — run the sync script against real APIs.

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

Single-context: `CONTEXT.md` + `docs/adr/` en la raíz. See `docs/agents/domain.md`.
