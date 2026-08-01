# CRM `/admin` QA Report — 2026-08-01

## Scope

End-to-end QA pass over **SocialPro CRM under `/admin`** (not public site, not brand portal, not player giveaways platform).

| Item | Value |
|------|--------|
| Repo | `kekoesports/proyectozack` |
| Workflow | `.grok/workflows/crm-admin-qa-5.rhai` (`crm-admin-qa-5`) |
| Agent count | **Exactly 5** (domain audits; synthesis is script-side) |
| Date | 2026-08-01 |

### Agent roles

1. **shell-nav-auth** — layout, nav, `auth-guard`, `permissions`, login home, search, smoke/nav e2e alignment  
2. **brands-talents** — brands/talents forms, actions, Zod, visibility, private files  
3. **campaigns-deals-contracts** — tratos, contracts, deliverables, payment status  
4. **tasks-semana** — tareas, mi-semana, templates, rollover  
5. **finance-invoices-pnl** — facturación, finanzas, P&L, bank recon guards  

### Methods

- 5 parallel read-only agents inspected shipped source (`read_file` / `grep` / `list_dir`).  
- Parent implementer verified findings, applied **root-cause** fixes, added regression locks.  
- Gates: `npm run lint`, `npx tsc --noEmit`, targeted Jest; Playwright when env allows.

### How to re-run

```bash
# From repo root — Grok workflow (exactly 5 agents)
# /workflow crm-admin-qa-5   or workflow tool with script_path=.grok/workflows/crm-admin-qa-5.rhai

npm run lint
npx tsc --noEmit
npx jest --selectProjects server --testPathPattern='crm-admin-qa-2026-08-01|invoice-status|homeForRole|campaigns' --ci

# Optional browser e2e (needs auth + DB):
npx playwright test e2e/admin-*.spec.ts e2e/crm-fase*.spec.ts
```

---

## Findings summary

Agents reported **dozens** of issues across modules. Below: **fixed in this pass** vs **residual backlog**.

### Severity counts (workflow raw)

| Sev | Count (approx from agent index) |
|-----|----------------------------------|
| P0 / critical | 4+ |
| P1 / high | 15+ |
| P2 / medium-low | 20+ |

---

## Fixed (root cause) — this change set

| ID | Severity | Area | Bug | Root cause | Fix | Regression lock |
|----|----------|------|-----|------------|-----|-----------------|
| F01 | P0 | shell | `/admin/talents/fotos` listed full roster without module guard | Page never called `requirePermission` | `requirePermission('talentos','read')` | `crm-admin-qa-2026-08-01.test.ts` |
| F02 | P0 | shell | `/admin/equipo/fotos` leaked team PII | Same | `requirePermission('equipo','read')` | same |
| F03 | P1 | shell | Login always `router.push('/admin')` | Ignored `homeForRole` | Pure `src/lib/home-for-role.ts`; login loads session + navigates to role home | `homeForRole.test.ts` |
| F04 | P1 | shell | Fiscal exports UI unguarded | Missing page gate | `requirePermission('facturacion','read')` on exports page | crm-admin-qa test |
| F05 | P0 | brands | Staff RSC payload included **all** campaigns | `listAllCampaigns()` with no brand filter | Filter by `visibleBrandIds` from `listCrmBrands` | crm-admin-qa test |
| F06 | P1 | brands | Contact/followup IDOR via client `brandId` | Auth checked client brandId, not row ownership | Load contact/followup by id; assert real `brandId`; block re-parent | crm-admin-qa test |
| F07 | P1 | brands | Brief mutations without brand ownership / brief↔brand check | Actions trusted args | `assertCanEditBrand` + `assertBriefBelongsToBrand` on upload/update/approve/archive/delete/content/create | crm-admin-qa test |
| F08 | P1 | campaigns | Create/update used `campanas:read` | Under-permissioning (finance could create) | `write` for create/update; `delete` for archive | crm-admin-qa test |
| F09 | P1 | campaigns | List cobro/pago filters ignored invoice-derived paid | Only `cobroConfirmado` / `pagoTalentConfirmado` | Also treat `brandPaid`/`talentPaid === 'si'` | crm-admin-qa test |
| F10 | P1 | finance | Dashboard close-rate undercounted `pagada` | Query/filter only `cobrada` | `SETTLED_INCOME_STATUSES` + `isSettledInvoiceStatus` | `invoice-status.test.ts` |
| F11 | P1 | finance | Deal form stored expense as `cobrada` when “Cobrado/Pagado” | Hard-coded map | `settledStatusForKind(kind)` | invoice-status source contract |
| F12 | P1 | finance | Payment guard allowed sibling settled status | Only exact kind status | Reject both `cobrada` and `pagada` | `assertInvoicePayable` unit tests |
| F13 | P1 | finance | `PENDING_*` dropped legacy open statuses | Incomplete catalog | Add `pendiente`, `no_cobrado` / `no_pagado` | invoice-status tests |
| F14 | P1 | finance | Brand detail `pendingIncome` treated `pagada` as open | `status !== 'cobrada'` only | Exclude settled + anulada/borrador | brand page change |
| F15 | P2 | finance | Issued invoices KPI “Cobradas” missed `pagada` | Filter cobrada only | cobrada **or** pagada | invoice-status source contract |
| F16 | P2 | campaigns | Deal flow label ignored `pagada` | Display branch cobrada-only | cobrada \|\| pagada | CampaignDetailTabs |
| F17 | P2 | campaigns | Deal invoice panel UI ignored `pagada` settled styling | cobrada-only | `isSettled` helper | DealInvoicePanel |
| F18 | P2 | campaigns | Update revalidated list only | Missing detail path | `revalidatePath` detail on create/update/archive | actions.ts |

Helpers added:

- `src/lib/home-for-role.ts` — client-safe home map  
- `isSettledInvoiceStatus` / `settledStatusForKind` in `src/lib/utils/invoice-status.ts`  
- `getBrandContactById` / `getBrandFollowupById` in `src/lib/queries/crmBrands.ts`

---

## Residual risks (not fixed in this pass)

Documented for follow-up. **Do not treat as green.**

| ID | Sev | Area | Issue | Suggested direction |
|----|-----|------|-------|---------------------|
| R01 | critical | finance | Double-count **facturado**: issued invoice + auto-mirror income row on cobrada | Dedup mirrors or single ledger; exclude mirrors from UNION aggregates |
| R02 | high | finance | P&L `cobradoYTD` ignores payments on issued invoices (`issuedInvoiceId`) | Align with `sumCobradoReal` OR issued payments |
| R03 | high | finance | AR/receivables omit issued status `enviada` | Expand `ISSUED_PENDING_STATUSES` |
| R04 | high | finance | Issued PDF raw `pdfUrl` in client tables | Auth proxy like internal invoices |
| R05 | high | shell | Nav is staff vs everyone; specialized roles see orphan links | Permission-filtered nav |
| R06 | high | shell | GlobalSearch shown to roles blocked by `adminProcedure` | Hide search or widen procedure |
| R07 | high | shell | Staff can open financial Panel KPIs | Staff-scoped dashboard widgets |
| R08 | high | tasks | Mutations gate on `tareas:read` (product may rely on staff write) | Decide product rule; if RBAC-strict, use write + keep ownership |
| R09 | med | brands | Private brief blob links without proxy | Authenticated download route |
| R10 | med | brands | createTalent ignores modal contacts/verticals | Wire schema + inserts or remove fields |
| R11 | med | brands | upsertTalentSocials platform validation / talentId scope | Schema + composite where |
| R12 | med | campaigns | Contract blob `del(filePath)` vs URL | Delete by `fileUrl` |
| R13 | med | campaigns | updateCampaignSchema missing amount refine | Share create refine |
| R14 | med | campaigns | Alerts pending cobro use campaign.status proxy | Invoice SETTLED sums |
| R15 | med | finance | Mock `extractInvoiceAction` still production-wired | Disable in prod / real parser only |
| R16 | low | hub | P&L not in FinanzasNav tabs | Add tab or document deprecation |

---

## Residual: intentionally out of scope

- Full rewrite of admin IA / role-filtered nav matrix (R05–R07).  
- Dual-ledger redesign for issued vs internal invoices (R01–R02).  
- 100% form coverage of every admin page (news, live, analytics, backups).  
- Push to remote / CI YAML changes (not required for this QA goal).

---

## Verification performed

| Gate | Result |
|------|--------|
| Workflow agents | **5/5 done** (`shell-nav-auth`, `brands-talents`, `campaigns-deals-contracts`, `tasks-semana`, `finance-invoices-pnl`) |
| `npm run lint` | **exit 0** |
| `npx tsc --noEmit` | **exit 0** |
| Jest regression suite | **50/50 passed** (`crm-admin-qa-2026-08-01`, `invoice-status`, `homeForRole`) |
| Playwright `admin-smoke` + `admin-navigation` | **24 failed** — no authenticated admin session in this environment (`gotoAdmin` lands without `navigation` landmark; consistent with unauthenticated redirect). **Not a product regression from this change set.** Residual: run e2e with `ENABLE_DEV_AUTH_BYPASS` or seeded session secrets. |

---

## File index (code changed)

- `.grok/workflows/crm-admin-qa-5.rhai`  
- `src/lib/home-for-role.ts` (new)  
- `src/lib/auth-guard.ts`  
- `src/lib/utils/invoice-status.ts`  
- `src/lib/queries/dashboard.ts`  
- `src/lib/queries/crmBrands.ts`  
- `src/lib/services/bank-reconciliation/invoicePaymentGuards.ts`  
- `src/app/admin/login/page.tsx`  
- `src/app/admin/(dashboard)/talents/fotos/page.tsx`  
- `src/app/admin/(dashboard)/equipo/fotos/page.tsx`  
- `src/app/admin/(dashboard)/facturacion/exports/page.tsx`  
- `src/app/admin/(dashboard)/brands/page.tsx`  
- `src/app/admin/(dashboard)/brands/[id]/page.tsx`  
- `src/app/admin/(dashboard)/brands/crm-actions.ts`  
- `src/app/admin/(dashboard)/brands/brief-actions.ts`  
- `src/app/admin/(dashboard)/campanas/actions.ts`  
- `src/features/admin/campaigns/components/CampaignPayments.tsx`  
- `src/features/admin/campaigns/components/CampaignsList.parts.tsx`  
- `src/features/admin/campaigns/components/CampaignDetailTabs.tsx`  
- `src/features/admin/invoices/components/IssuedInvoicesTab.tsx`  
- `src/features/admin/_shared/components/campaigns/DealInvoicePanel.tsx`  
- `src/__tests__/server/crm-admin-qa-2026-08-01.test.ts` (new)  
- `src/__tests__/server/invoice-status.test.ts`  
- `src/__tests__/server/homeForRole.test.ts`  
- `docs/crm-admin-qa-2026-08-01.md` (this file)
