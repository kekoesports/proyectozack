Status: blocking-prd-3-merge

# 04 — Remanente de saneamiento (bloquea slice 04)

## Parent

`.scratch/eslint-strict-activation/issues/04-activate-strict-rules.md`

## Resumen

Activar las 10 reglas estrictas en `eslint.config.mjs` produce **125 errores en 58 archivos**. El AC del slice 04 es explícito:

> Si falla → no mergear, abrir issue de remanente y completar saneamiento PRD 2 antes.

PRD 2 (saneamiento) no está completo. Slice 04 queda bloqueado hasta que se cierren estos 125 errores.

## Distribución por regla

| Regla | Errores |
|---|---|
| `@typescript-eslint/no-non-null-assertion` | 74 |
| `@typescript-eslint/no-unsafe-assignment` | 22 |
| `@typescript-eslint/no-misused-promises` | 11 |
| `@typescript-eslint/no-unsafe-member-access` | 8 |
| `@typescript-eslint/no-unsafe-argument` | 6 |
| `@typescript-eslint/no-unsafe-return` | 2 |
| `@typescript-eslint/consistent-type-assertions` | 2 |
| **Total** | **125** |

## Top archivos (≥3 errores cada uno)

- `src/lib/pdf/generateInvoicePdf.ts` — 15
- `src/lib/services/youtube.ts` — 8
- `src/lib/services/twitch.ts` — 7
- `src/lib/queries/alerts.ts` — 7
- `src/lib/utils/week.ts` — 4
- `src/features/admin/talents/components/TalentExport.tsx` — 4
- `e2e/public-dynamic-routes.spec.ts` — 4 (Playwright e2e — nota: no cubierto por el override de tests del slice 02, que solo apaga reglas en `*.test.*` y `__tests__/**`)
- `src/lib/utils/import-utils.ts` — 3
- `src/features/admin/invoices/components/AccountingImporter.tsx` — 3
- `src/features/admin/brands/components/BrandFormModal.tsx` — 3
- `src/features/admin/analytics/components/GrowthReport.tsx` — 3
- `src/features/admin/_shared/components/dashboard/PipelineChartCard.tsx` — 3
- `src/features/admin/_shared/components/campaigns/ContractGenerator.tsx` — 3
- `src/app/admin/(dashboard)/targets/actions.ts` — 3
- `src/app/admin/(dashboard)/talents/import/actions.ts` — 3

(El listado completo de 58 archivos está en `git log` o se reproduce activando temporalmente las reglas y corriendo `npm run lint`.)

## Patrones observados

1. **`x!` (non-null assertion) — 74 casos.** Mayoría son lookups `Map.get()`, `arr[0]`, `match[1]` post-`.match()`. Reemplazos típicos:
   - `arr[0]!` → `const first = arr[0]; if (!first) throw …`
   - `map.get(k)!` → narrowing tras `if (!val)` o `?? throw`.
   - `match[1]!` (regex) → `if (!match) return; const [, capture] = match;`.
2. **`no-misused-promises` en handlers — 11 casos.** Patrón: `<form onSubmit={asyncFn}>`. Wrapping recomendado: `onSubmit={(e) => void asyncFn(e)}` o `onSubmit={(e) => { void asyncFn(e); }}`.
3. **`no-unsafe-*` en `generateInvoicePdf.ts`, `youtube.ts`, `twitch.ts`, `alerts.ts`.** Sospechoso: parsing de respuestas externas sin Zod schema. Encaja con la regla 4 de `.claude/rules/typescript.md` (boundary parsing).
4. **`consistent-type-assertions` con `objectLiteralTypeAssertions: 'never'`** — 2 casos donde se usa `{ … } as Foo` en vez de `const x: Foo = { … }`.

## Sub-tareas sugeridas (para abrir como issues separadas en PRD 2)

A — `non-null-assertion` cleanup en `src/lib/queries/` y `src/lib/services/` (~25 errores).
B — `non-null-assertion` cleanup en `src/features/admin/` (~25 errores).
C — `non-null-assertion` cleanup en `src/app/` y otros (~20 errores).
D — Reemplazar `<form onSubmit={asyncFn}>` por `void` wrapper en login/forgot/reset/ContractGenerator/ProposalModal/AddTalentModal/IssuedInvoiceForm/BillingMovementModal/CreatorApplyForm/etc (11 casos).
E — Añadir Zod schemas en boundaries de `youtube.ts`, `twitch.ts`, `generateInvoicePdf.ts`, `alerts.ts` (mayoría de los `no-unsafe-*`).
F — Decidir si extender el override del slice 02 a `e2e/**` (4 errores en Playwright specs) — el PRD limitó el override a `*.test.*` y `__tests__/**`. Discutir antes de extender.
G — Convertir 2 object-literal type assertions a `const x: T = {...}`.

## Acceptance criteria (para destrabar slice 04)

- [ ] Saneamiento sub-A → sub-G completado (o decisión documentada de aceptar 1-2 disable comments con razón explícita).
- [ ] `npm run lint` con todas las reglas estrictas activas pasa verde.
- [ ] Si quedan disable comments individuales (≤2-3), cada uno con `// eslint-disable-next-line @typescript-eslint/<rule> -- <razón>`.
- [ ] Slice 04 reactivado mergeable.

## Reproducir

```bash
# Reactivar reglas estrictas (no commitear):
git stash  # asegurarse de no tener cambios
# editar eslint.config.mjs y añadir el bloque rules con las 10 reglas como error
npm run lint 2>&1 | tee /tmp/lint.txt
# revertir el cambio
git checkout -- eslint.config.mjs
```
