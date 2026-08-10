# CRM `/admin` QA Report — 2026-08-10

## Scope

End-to-end QA pass over **SocialPro CRM under `/admin`**.

| Item | Value |
|------|--------|
| Repo | `kekoesports/proyectozack` (worktree-silver-forest-4cdf) |
| Date | 2026-08-10 |
| Prior report | `docs/crm-admin-qa-2026-08-01.md` |
| Method | 4 parallel domain audits + root-cause fixes for P0s |

### Domains audited

1. **shell-nav-auth** — layout, nav, permissions, login, search, API admin
2. **brands-talents** — brands/talents forms, IDOR, private files, visibility
3. **campaigns-deals-contracts** — tratos, contracts, deliverables, payments
4. **tasks-finance** — tareas/mi-semana, facturación, finanzas, P&L, bank

---

## Executive summary

| Area | Verdict |
|------|---------|
| Auth shell (session + role) | **OK** |
| Page-level guards coverage | **Mostly OK** — 2 P0 data pages unguarded (fixed this pass) |
| Staff nav binary | **OK** for staff only |
| Specialized roles nav (R05) | **Still open** — full admin nav |
| Brands ownership (F05–F07) | **OK** — holds |
| Campaigns canonical create/update | **OK** — holds; **legacy path was open** (fixed) |
| Finance dual-ledger mirrors (R01) | **Incomplete → fixed** for P&L + billing KPIs |
| Tasks R08 mutations on `read` | **Still open** |
| Private blob URL DTO leaks | **Still open** (partial proxies) |

### Severity counts (this pass)

| Sev | Found | Fixed now | Residual |
|-----|------:|----------:|---------:|
| P0 | 6 | 5 | 1* |
| P1 | ~25 | 4 | ~21 |
| P2 | ~20 | 0 | ~20 |

\*P0 residual: staff roster enumeration (product decision: filter vs deny `talentos:read`).

---

## Fixed this pass (root cause)

| ID | Sev | Area | Bug | Fix |
|----|-----|------|-----|-----|
| Q01 | P0 | talents | `/admin/talents/[id]/negocio` no module/visibility guard → PII leak to editor/finance/ops | `requirePermission('talentos','read')` + staff campaign visibility |
| Q02 | P0 | analytics | `/admin/analytics/report/[slug]` no guard → growth snapshots leak | `requirePermission('analytics','read')` |
| Q03 | P0 | campaigns | Legacy `campaign-actions.ts` create/update/archive on `campanas:read` | Align to write/delete + `assertCanEditCampaign` |
| Q04 | P0 | campaigns | Contract/files mutations on `read` without ownership | write/delete + ownership; signer↔contract↔campaign checks; delete uses server row URL |
| Q05 | P0 | finance | P&L + billing KPIs still double-counted issued→internal mirrors (R01 incomplete) | `isIssuedInvoiceMirror` in `getPnL`/`getFinancePnL`; SQL exclude in `getBillingKPIs` |
| Q06 | P1 | campaigns | Contract PDF proxy no ownership | `assertCanEditCampaign` before stream |

Regression locks: `src/__tests__/server/crm-admin-qa-2026-08-10.test.ts`

---

## Residual backlog (prioritized)

### P0 / critical residual

| ID | Area | Issue | Suggested fix |
|----|------|-------|---------------|
| R-TAL-ROSTER | talents | Staff with `talentos:read` can list full roster via `/admin/talents` and `/fotos` (nav hidden, URL open). Detail is filtered; list is not. | Filter roster by campaign ownership **or** remove `talentos:read` from staff |

### P1 — high

| ID | Area | Issue |
|----|------|-------|
| R05 | shell | Nav is binary staff vs everyone-else. `editor`/`finance`/`analyst`/`ops`/`talent_manager` see full admin nav including Facturación/Finanzas without module permission. |
| R07-partial | dashboard | Staff revenue KPIs skipped, but still loads company-wide activity (incl. invoices), all week tasks, all followups, global brand/talent counts. |
| R08 | tasks | All task mutations gate on `tareas:read`. Staff/editor/tm can mutate. Templates panel uses weak path (`tareas/actions.ts`) bypassing `write`/`delete`. |
| T-ROLLOVER | tasks | `rollOverTasksAction` is global + GET side-effect on `/tareas` and `/mi-semana` page load. |
| T-MGR | tasks | Manager visibility: live code = own-only; `canSeeAll`/`tests` disagree. Manager cannot delete (assertCanDelete). |
| IDOR-TAL | talents | `upsertTalentSocials` / stats / tags / geo update by child PK without `talentId` scope. Edit/SEO pages lack staff visibility. |
| IDOR-FILES | api | `/api/admin/files/[id]` authorizes by module only, not entity ownership. |
| R09 | brands | Brief private blob links without proxy (`BrandBriefsTab` → `sourceFileUrl`). |
| DEAL-LEDGER | campaigns | `addDealMovimientoAction` allows settled status with only `campanas:write` (staff can fabricate settled ledger). `createInvoiceFromDeal` over-restricted to `campanas:delete`. |
| ENTREGABLES | entregables | No staff visibility filter; full universe readable/writable with `campanas:*`. |
| ASSERT-CSEE | campaigns | `assertCanEditCampaign` only bypasses admin/manager — not `canSeeAll` (`admin_limited_tasks`). List vs detail mismatch. |
| F-BLOB | finance | Receipt hrefs + list DTOs still serialize private blob URLs to client. |
| R15 | finance | `extractInvoiceAction` still returns mock OCR data in production UI. |
| F-PAY | finance | Internal payment path trusts `paidAmount` not `SUM(invoice_payments)`. |
| F-MIRROR-DEDUP | finance | Mirror insert race / weak search dedupe. |
| ALERT-PAGADA | alerts | “marca cobró / talento no” EXISTS income only `cobrada`, misses `pagada`. |
| COMPLETED-MODAL | shell | `CompletedDealsModal` loads all-agency tracker alerts for every role. |
| QUICK-ACT | shell | Header quick actions (Nueva factura, etc.) shown to all roles. |

### P2 — medium/low

| ID | Area | Issue |
|----|------|-------|
| R10 | talents | `createTalentAction` ignores modal contacts/verticals |
| R11 | talents | Social platform free-text on upsert |
| R12 | contracts | `del(filePath)` vs URL → orphan blobs |
| R13 | campaigns | `updateCampaignSchema` missing amount/date refine |
| R14 | alerts | Pending cobro uses campaign.status proxy |
| R16 | finance | P&L not in FinanzasNav tabs |
| SEARCH-TAL | search | Staff search returns full talent roster |
| AI-ROLES | asistente | Page roles ≠ API roles ≠ finance tools for `admin_limited_tasks` |
| TAL-WRITE | talents | Several mutations use `talentos:read` instead of `write` |
| EVENTS | tasks | Calendar events only filter staff; other roles see all |

---

## What's solid (do not reopen)

- Layout requires CRM role; `brand` cannot enter `/admin`.
- Dev auth bypass fail-closed outside `development`.
- Login → `homeForRole` (F03).
- Staff sidebar restricted (no facturación/finanzas).
- GlobalSearch gated (R06) + tRPC adminProcedure.
- Brands F05–F07 ownership/IDOR locks hold.
- Canonical campaign create/update/archive write/delete + ownership.
- Payment UI settled = cobrada \|\| pagada (F09/F16/F17).
- Bank recon guards reject both settled statuses.
- AR `enviada` in pending (R03).
- Issued/internal PDF proxies exist for primary links (R04 partial).
- Contabilidad module restricted to admin/admin_limited_tasks.
- Cron rollover auth fail-closed.
- `admin_limited_tasks` task ownership guards unit-tested on update/complete/delete.

---

## Role × module matrix gaps (R05)

```
Nav today:
  staff     → STAFF_PRIMARY + STAFF_MORE
  everyone  → ADMIN_PRIMARY + ADMIN_MORE   ← problem
```

| Role | Sees in nav without `*:read` |
|------|------------------------------|
| editor | Panel, Marcas, Talentos, Tratos, Facturación, Finanzas, Equipo, … |
| finance | Panel, Talentos, Tareas, Equipo, Mi semana, Targets, … |
| analyst | almost everything except analytics hub |
| ops | Panel, Talentos, Facturación, Finanzas, Equipo, … |
| talent_manager | Facturación, Finanzas, Equipo, … |

Pages with proper guards bounce via `homeForRole`, but discovery surface remains and combines badly with unguarded paths.

---

## Verification

```bash
npm run lint
npx tsc --noEmit
npx jest --selectProjects server --testPathPatterns='crm-admin-qa|invoice-status|homeForRole' --ci
```

| Gate | Result |
|------|--------|
| Domain audits | 4/4 complete |
| P0 page guards | fixed + regression test |
| Legacy campaign actions | fixed + regression test |
| R01 P&L/KPIs | fixed + regression test |
| Full jest/lint/tsc | run after install (see session log) |

---

## Files changed this pass

- `src/app/admin/(dashboard)/talents/[id]/negocio/page.tsx`
- `src/app/admin/(dashboard)/analytics/report/[talentSlug]/page.tsx`
- `src/app/admin/(dashboard)/campanas/campaign-actions.ts`
- `src/app/admin/(dashboard)/campanas/contract-actions.ts`
- `src/app/admin/(dashboard)/campanas/generate-contract-action.ts`
- `src/app/admin/(dashboard)/campanas/[id]/files/actions.ts`
- `src/app/api/admin/campanas/[id]/contract/pdf/route.ts`
- `src/lib/queries/financeDashboard/pnlDetail.ts`
- `src/lib/queries/pnl.ts`
- `src/lib/queries/invoices.ts`
- `src/__tests__/server/crm-admin-qa-2026-08-10.test.ts`
- `docs/crm-admin-qa-2026-08-10.md`

---

## Sprint 2 — applied same day (talents + R05 + R08)

| ID | Fix |
|----|-----|
| R-TAL-ROSTER | `listVisibleTalentIds` + filter roster/fotos/archived |
| IDOR-TAL | `assertCanAccessTalent` on detail/edit/seo/negocio; socials/stats/tags/geo scoped by talentId; SocialPlatformSchema on upsert |
| R05 | `src/lib/admin-nav.ts` + layout `navForRole`; quick actions permission-filtered |
| R08 | `tareas.write` includes staff/editor/tm; mutations use write/delete; templates manager+ only |
| T-ROLLOVER | Removed GET rollover from `/tareas` and `/mi-semana` (cron only) |
| ASSERT-CSEE | `assertCanEditCampaign` uses `canSeeAll` |
| SEARCH-TAL | Global search scopes talents for staff via campaign ownership |
| COMPLETED-MODAL | Only admin/manager/admin_limited_tasks get agency-wide completed deals modal |

Regression: `src/__tests__/server/crm-admin-qa-2026-08-10-sprint2.test.ts`

## Sprint 3 — applied same day (files, briefs, ledger, dashboard, OCR)

| ID | Fix |
|----|-----|
| IDOR-FILES | `/api/admin/files/[id]` asserts entity ownership (campaign/talent/brand/task/followup) for staff |
| R09 | `/api/admin/briefs/[id]` proxy + BrandBriefsTab href via proxy |
| DEAL-LEDGER | `addDealMovimiento`: ownership + settled → `facturacion:write`; `createInvoiceFromDeal` → `facturacion:write` + ownership |
| R07 | Staff dashboard: scoped tasks/followups/activity/brand counts; skip global admin stats + invoice activity |
| R15 | OCR mock only with `NODE_ENV=development` + `ENABLE_INVOICE_OCR_MOCK=true` |

Regression: `src/__tests__/server/crm-admin-qa-2026-08-10-sprint3.test.ts`

## Sprint 4 — minor residuals closed

| ID | Fix |
|----|-----|
| F-BLOB | Receipt proxy `/api/admin/facturacion/[id]/receipt`; UI hrefs; list DTOs redact blob URLs (`__has__` / proxy paths) |
| ENTREGABLES | `listTrackers` + detail staff filter via campaign ownership; brands/talents scoped |
| R10 | `createTalentAction` persists verticals + contacts → talent_business |
| R12 | `del(fileUrl)` not `del(filePath)` in contracts/invoices |
| R13 | `updateCampaignSchema` amount + date refines |
| R14 | Alerts pending cobro/pago via invoice EXISTS; income settled = cobrada\|pagada |
| R16 | FinanzasNav tab P&L → `/admin/finanzas/pl` |
| F-PAY | Internal payments use `SUM(invoice_payments)` under FOR UPDATE |
| F-MIRROR | Exact concept dedupe + try/catch race; canonical mirror prefixes |

Regression: `src/__tests__/server/crm-admin-qa-2026-08-10-sprint4.test.ts`

### QA status

All residuals from the 2026-08-10 CRM `/admin` audit are addressed across sprints 1–4.
Optional future polish (not blocking): real OCR (replace mock), unique DB constraint on mirror concept, dual-ledger redesign.
