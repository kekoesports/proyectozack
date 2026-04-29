# SocialPro — Roadmap

> Last updated: 2026-04-26. All bootstrap, structural, and CRM redesign phases complete.
> Read this file at the start of every session before touching any code.

---

## Architecture reminders

| Concern | Where |
|---|---|
| YouTube API | `src/lib/services/youtube.ts` — `YOUTUBE_API_KEY` env (10K units/day) |
| Twitch API | `src/lib/services/twitch.ts` — `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` env |
| DB singleton | `src/lib/db.ts` — Neon + Drizzle, edge-safe |
| Auth guard | `src/lib/auth-guard.ts` — `requireAnyRole(['admin','manager','staff'], path)` |
| Permissions | `src/lib/permissions.ts` — `canSeeAll`, `canDelete`, `assertCanDelete` |
| Server actions pattern | `src/app/admin/(dashboard)/facturacion/invoices-actions.ts` — reference impl |
| Spreadsheet UI pattern | `src/components/admin/talents/RosterSpreadsheet.tsx` |
| Follower sync | `scripts/sync-followers.ts` — YouTube + Twitch via real APIs |
| Committer | `scripts/committer "type(scope): msg" file1 file2 ...` |
| Migration workflow | `npx drizzle-kit generate` → `npm run migrate` (NOT `npx drizzle-kit migrate`) |
| Invoice files backfill | `npm run migrate:invoice-files` — idempotent, safe to re-run |
| Task templates seed | `npm run seed:tasks` — idempotent, 18 plantillas |

---

## ✅ CRM Redesign — DONE (26-04-2026)

All 6 phases of the CRM redesign are complete. See `CLAUDE.md` section "CRM Modules" for full details.

| Fase | Plan | Estado | Migraciones |
|------|------|--------|-------------|
| 1 — Base operativa | `crm-fase-1-base.md` | ✅ Done | 0033 |
| 2 — Talentos | `crm-fase-2-talentos.md` | ✅ Done | 0034 |
| 3 — Campañas/Tratos | `crm-fase-3-campanas.md` | ✅ Done | 0035 |
| 4 — Tareas recurrentes | `crm-fase-4-tareas.md` | ✅ Done | 0036 |
| 5 — Finanzas (P&L) | `crm-fase-5-finanzas.md` | ✅ Done | 0037 |
| 6 — Pulido visual | `crm-fase-6-pulido.md` | ✅ Done | — |

### Verification summary (26-04-2026, post-audit)
- `npx tsc --noEmit`: OK
- `npm test -- --selectProjects server`: 14 suites / **170 tests** OK
- `npm run test:fuzz`: 12 suites / 86 tests OK
- `npm run build`: OK (123 routes, includes `/admin/pl`, `/admin/pl/export`, `/api/admin/search`)
- `npx playwright test e2e/crm-fase*.spec.ts`: 22/22 OK (Fases 3–6)
  - Fase 3: 3 specs (campaigns smoke)
  - Fase 4: 3 specs (tasks + templates smoke)
  - Fase 5: 3 specs (invoices + P&L + CSV BOM)
  - Fase 6: 3 specs (search API) + 10 specs (responsive iPhone SE + iPad)
- `npx drizzle-kit generate`: "No schema changes" — cadena de snapshots íntegra.

### Security audit + Review (26-04-2026)

**Security**: 3 CRITICALs + 3 HIGHs + 3 MEDIUMs reportados → CRITICALs y HIGHs corregidos:
- C1: Cron `/api/cron/rollover-tasks` ahora fail-closed sin `CRON_SECRET`. Tests añadidos (503 sin secret, 200 con `x-vercel-cron: 1`).
- C2: `escapeCsv` neutraliza prefijos de fórmula (`=+-@\t\r`).
- C3: Path de Vercel Blob ahora usa `crypto.randomBytes(16).toString('hex')` (32 hex chars) — no enumerable.
- H1: Magic byte validation en uploads (PDF / JPEG / PNG / WebP). Server fuerza `contentType` derivado, no `file.type` del cliente.
- H2: `invoices.notes` capped a `.max(5000)`.
- H3: Search query `q` capped a 100 chars (route handler + query layer).

**Quality review**: 3 BLOCKERs + 2 MINORs reportados → BLOCKERs corregidos:
- B1: `margenNeto` eliminado de `PnLResult` (era idéntico a `margenBruto`).
- B2: `drizzle/meta/0036_snapshot.json` reconstruido (cadena id→prevId reparada).
- B3: `TaskTemplatesManager` muestra labels (`Diaria/Semanal/Mensual`).
- Mejoras menores aplicadas: `role="combobox"` en GlobalSearch, friendly error en `deleteInvoiceAction`, bracket tag en cron error.

---

## Pending

### R2 — Server actions naming (apply on next touch, not proactively)

Convention: multi-domain routes use `[domain]-actions.ts`, no bare `actions.ts`.

| Current | Rename to |
|---|---|
| `app/admin/(dashboard)/targets/actions.ts` | `targets-actions.ts` |
| `app/admin/(dashboard)/giveaways/actions.ts` | `giveaway-actions.ts` |

When renamed, update the "Server actions pattern" pointer in the architecture table above.

### R3 — Follow-up items from CRM Fase 6

These were explicitly deferred and documented in `crm-fase-6-pulido.md`:

- **Lighthouse a11y audit**: run `axe-core` on `/admin` and fix any issues scoring < 90.
- **Micro-interacciones finas**: hover scale on KPI cards, pulse on "vencido" badges, spring entry on EditDrawer. Currently basic transitions only.
- **P&L donut chart**: "categorías de gasto" donut in P&L page (recharts already installed).
- **XLSX export**: if user requests Excel format, add `exceljs` and extend `/admin/pl/export`.
- **pg_trgm search optimization**: if global search > 300ms with real data volume, add `CREATE EXTENSION pg_trgm` and GIN indexes.
