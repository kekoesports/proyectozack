# Handoff — Sprint finanzas: clasificación, nuevos subtipos y wizard 2026

**Sesión:** 2026-06-28  
**Estado al cerrar:** 3 PRs mergeados, master limpio, CI verde, wizard disponible en producción. Sin datos reales insertados.

---

## 1. PRs mergeados esta sesión

### PR #109 — `fix/recurring-expense-propagate-classification`

**Problema:** `createInvoiceForMonth` generaba facturas desde plantillas recurrentes sin propagar `expenseGroup` ni `expenseSubtype`. Las facturas mensuales resultantes quedaban sin clasificar, rompiendo los filtros P&L y el dashboard de gastos operativos.

**Fix:** 2 líneas en `src/lib/queries/recurringExpenses.ts` para pasar `template.expenseGroup` y `template.expenseSubtype` al `db.insert(invoices)`. Tests: 17 nuevos en `src/__tests__/server/recurring-expenses.test.ts`.

---

### PR #110 — `feat/expense-subtypes-payroll-insurance`

**Problema:** El enum `expense_subtype` no tenía valores para las categorías de nóminas de socios, cuotas RETA, seguro médico y seguridad social. Estos gastos no podían clasificarse correctamente ni agruparse en el P&L.

**Cambios:**
- `src/db/schema/invoices.ts` — 4 valores nuevos al enum: `factura_autonomo`, `nomina_socio`, `seguro_medico`, `seguridad_social`
- `src/lib/schemas/invoice.ts` — `EXPENSE_SUBTYPES_OPERATIONAL` pasa de 9 a 13 items; labels añadidos
- `drizzle/0100_curious_doomsday.sql` — 4× `ALTER TYPE ADD VALUE` (non-destructive, idempotente)
- Tests: 9 nuevos en `src/__tests__/server/expense-classification.test.ts`

---

### PR #111 — `feat/finance-expense-setup-2026`

**Problema:** No había forma de cargar los gastos operativos históricos de 2026 (nóminas, autónomos, gestoría, seguro) de forma segura, con revisión previa y protección anti-duplicados.

**Cambios:**

| Archivo | Rol |
|---|---|
| `src/lib/finance/setup2026/types.ts` | Tipos: `HistoricalExpenseRow`, `RecurringExpenseRow`, `Setup2026HistoricalConfig`, `ApplyResult` |
| `src/lib/finance/setup2026/generator.ts` | Funciones puras: `estimateGross`, `calcTotal`, `makeTxId`, `generateHistoricalRows`, `generateRecurringTemplates`, `summarize` |
| `src/lib/queries/setup2026.ts` | DB: `getExistingSetupTxIds`, `previewSetup2026`, `applySetup2026` |
| `src/app/admin/(dashboard)/finanzas/setup-2026/actions.ts` | Server Actions: `previewSetup2026Action`, `applySetup2026Action` |
| `src/app/admin/(dashboard)/finanzas/setup-2026/page.tsx` | RSC shell con `requirePermission('facturacion', 'write')` |
| `src/features/admin/finance-setup/Setup2026Wizard.tsx` | Wizard cliente 4 pasos (Config → Preview editable → Confirm → Result) |
| `src/__tests__/server/setup2026-generator.test.ts` | 30 tests: `calcTotal`, `estimateGross`, `makeTxId`, rows, summarize, recurring, idempotencia |
| `src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx` | +1 tab "Setup 2026" |

**Garantías clave:**
- Ningún dato se inserta al cargar la página
- Solo el botón "Confirmar y crear" del Step 3 llama a `applySetup2026Action`
- Deduplicación por `txId` (`setup2026:{tipo}:{persona}:{YYYY-MM}`) para facturas
- Deduplicación por `name` para templates recurrentes
- Sin migración — usa los subtipos de PR #110

---

## 2. Estado actual

| Check | Estado |
|---|---|
| `master` | Limpio (`nothing to commit`) |
| CI (Lint + Type-check + Tests + Build + Vercel) | ✅ Verde |
| Ruta `/admin/finanzas/setup-2026` | Disponible en producción |
| Datos reales en `invoices` / `recurringExpenses` via wizard | **No insertados** |
| Suite de tests | 1355 tests, 79 suites, 0 fallos |

---

## 3. Siguiente paso manual (no de código)

Entrar al wizard y cargar los gastos históricos reales:

1. Ir a `/admin/finanzas/setup-2026`
2. En **Step 1 (Config)** revisar y ajustar los importes reales:
   - Nómina Pablo: neto real, IRPF real, meses reales (enero–marzo o los que apliquen)
   - Nómina Alfonso: ídem
   - Cuota autónomo Pablo (RETA): importe mensual real
   - Cuota autónomo Alfonso (RETA): importe mensual real
   - Gestoría: importe neto, IVA 21%, meses reales
   - Seguro médico: importe mensual, meses reales
3. Marcar si crear templates recurrentes (para gestoría y seguro desde julio en adelante)
4. Avanzar a **Step 2 (Preview)** — revisar fila a fila; las filas ya existentes aparecerán con badge ⚠ y deshabilitadas
5. Editar inline cualquier campo incorrecto (concepto, importes, fecha)
6. Avanzar a **Step 3 (Confirm)** — ver resumen final con total EBITDA y conteo de filas a crear
7. Pulsar **"Confirmar y crear"** solo cuando los números estén correctos

---

## 4. Siguiente PR recomendado — después de cargar datos

**`feat/finance-ebitda-monthly-breakdown`**

**Objetivo:** mostrar EBITDA devengado y caja por mes, desglosado en categorías.

**Vista propuesta:** tabla mes × categoría con totales:

| Mes | Ingresos | Costes directos campaña | Nóminas socios | Autónomos (RETA) | Gestoría | Seguro médico | Otros operativos | EBITDA devengado | Cobros reales | EBITDA caja |
|---|---|---|---|---|---|---|---|---|---|---|
| ene 2026 | ... | ... | ... | ... | ... | ... | ... | **X** | ... | **Y** |

**Fuentes de datos:**
- Ingresos: `invoices` WHERE `kind='income'` AND `status IN ('cobrada','pagada')`
- Costes directos: `invoices` WHERE `expenseGroup='campaign_direct'`
- Nóminas: `expenseSubtype='nomina_socio'`
- Autónomos: `expenseSubtype IN ('cuota_autonomo','factura_autonomo','seguridad_social')`
- Gestoría: `expenseSubtype='gestoria'`
- Seguro: `expenseSubtype='seguro_medico'`
- EBITDA devengado: `sum(netAmount)` ingresos − `sum(netAmount)` gastos
- EBITDA caja: requiere `invoicePayments` (ya existe la tabla)

**Archivos a tocar:**
- `src/lib/queries/ebitda.ts` — nueva query con GROUP BY mes + subtype
- `src/app/admin/(dashboard)/finanzas/pl/page.tsx` — añadir sección breakdown
- Componente tabla en `src/features/admin/finance/EbitdaMonthlyBreakdown.tsx`

**Prerequisito:** tener datos cargados vía wizard (PR #111) para que la vista tenga contenido real.
