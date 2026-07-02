# Finanzas — Documentación del módulo

Última actualización: **2026-07-02** (cierre del loop nocturno: rediseño resumen V2 + TD-14).

Documento de referencia para entender qué muestra cada pantalla del panel `/admin/finanzas`, cómo se calcula cada cifra y qué gastos recurrentes están dados de alta.

---

## 1. `/admin/finanzas/resumen` — Home CEO/YTD

**Ruta canónica**: `/admin/finanzas/resumen`. Es la home financiera desde el sidebar admin (`Finanzas → /resumen`) y el destino del redirect legacy `/admin/facturacion/dashboard` → 308.

Responde de un vistazo a *"de lo que hemos facturado, cuánto se queda SocialPro"*.

Rango por defecto: **YTD (año en curso)** — 1-ene → hoy (Europe/Madrid). Selector `from`/`to` deep-linkable (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) para acotar cualquier periodo.

**Bloques (en orden):**

1. **Ingresos** — cobrados / pendientes de cobro / total facturado.
2. **Costes directos + margen bruto** — pagos a talentos y costes producción, junto al margen bruto cobrado y el pendiente.
3. **Nóminas socios** — separadas Pablo / Alfonso / (sin identificar).
4. **Impuestos y cargas** — cuotas autónomo por socio, Seguridad Social, fiscal/impuestos.
5. **Gastos operativos** — gestoría, software/IA, hosting/dominio, seguro médico, comisiones, marketing, otros.
6. **Resultado operativo** — con desplegable "Ver cómo se calcula" que muestra la fórmula paso a paso.
7. **Pendientes destacados** — 3 columnas top 5 (cobros campañas, pagos talento, pagos operativo) + margen pendiente estimado.

**Fórmulas (todas base caja, fuente canónica `invoice_payments`):**

```
ingresosCobrados      = SUM(invoice_payments.amount) income ∈ periodo
ingresosFacturados    = SUM(totalAmount) income no-anulada ∈ periodo
pendienteCobrar       = facturados − cobrados

costesDirectosPagados = SUM(invoice_payments.amount)
                        invoices.expenseGroup = 'campaign_direct' ∈ periodo
costesDirectosPend    = totalAmount campaign_direct no-anulada
                        − pagosCash proporcional al accrual

margenBrutoCobrado    = ingresosCobrados − costesDirectosPagados
margenBrutoPendiente  = pendienteCobrar  − costesDirectosPendientes

nominasTotal          = SUM(nomina_socio) no-anulada
impuestosTotal        = cuota_autonomo + factura_autonomo + seguridad_social
                        + fiscal_impuestos + ajuste_fiscal
operativosTotal       = operational excluyendo nóminas e impuestos

resultadoOperativo    = margenBrutoCobrado − nominasTotal − impuestosTotal
                        − operativosTotal

margenPendienteEstimado = cobrosCampanasPendientes − pagosTalentoPendientes
```

Query única (`server-only`): `src/lib/queries/financeDashboard/finanzasResumenV2.ts`. Lógica pura testeable en `finanzasResumenV2.shared.ts`. **No lee `invoices.paidAmount`** (deprecated) — usa `invoice_payments` como fuente canónica.

---

## 2. `/admin/finanzas/mes` — Control mensual (legacy)

**Ruta anterior**: era `/admin/finanzas/resumen`; se movió a `/mes` en el rediseño de julio 2026 para dejar libre la ruta principal para el YTD nuevo. La sidebar admin sigue apuntando `Finanzas → /resumen` (el nuevo).

Enfoque **mensual**: siempre un mes concreto (selector `MonthSelector` que hace `router.push('/admin/finanzas/mes?mes=YYYY-MM')`).

**Contenido:**

- 6 KPIs CEO-friendly del mes: Facturado / Cobrado / Pendiente cobrar / Gastado / Resultado / Pendiente pagar.
- Alertas (si hay).
- Breakdown de gastos del mes por subtipo.
- Widget "Cobros pendientes" (top 30 receivables).
- Documentos del mes.

Query base: `getMonthlyFinanceFlow`, `getFinanceStockKPIs`, `getMonthlyExpenseBreakdown`, `getMonthlyDocs`, `getFinanceDashboard()` (agregador).

**Nota TD-14 cerrada**: hasta 2026-07-02 el widget "Cobros pendientes" leía `invoices.paidAmount` deprecated para el path internal. Ya migrado a `SUM(invoice_payments.amount)` — mismos números que las otras vistas.

---

## 3. `/admin/finanzas/pl` — Histórico mensual y P&L

Enfoque **anual/YTD** con filtros ricos (`from`, `to`, `company`, `brandId`, `talentId`).

**Contenido:**

- `PnLOverviewCards` — 8 cards: ingresos, gastos, margen, comisión agencia, pagos a creadores, pendiente cobro/pago, cobrado YTD, pagado YTD.
- Grid de 3 cards por `expenseGroup`: Costes directos / Gastos operativos / Sin clasificar (amber si > 0).
- Caja YTD: cobrado (real) y pagado (accrual).
- **Bloque expandible "Dónde se ha ido el dinero"** — el más útil para negocio. 17 subgrupos con desglose por socio (Nóminas Pablo/Alfonso, Cuota Pablo/Alfonso) y detalle expandible con `<details>/<summary>`. Al final subtotales por categoría: `Costes directos de campaña` / `Gastos operativos` / (`Sin clasificar` si > 0) + Total gastos.
- Tabla mensual + top categorías legacy.

Query: `getFinancePnL(filters)` en `src/lib/queries/financeDashboard/pnlDetail.ts`. Agregación en memoria en `expenseSubgroups.ts` con `classifyExpenseSubgroup()` (partner-aware para nóminas/cuotas).

---

## 4. `/admin/finanzas/cobros` — AR aging

Vista dedicada a lo pendiente de cobrar (AR aging sin dunning automático).

**Contenido:**

- 6 KPIs: Total pendiente / Total vencido / Facturas vencidas / Pendiente por vencer / Mayor deuda por marca / Promedio días de retraso.
- 5 barras horizontales por antigüedad: Por vencer, 0-30, 31-60, 61-90, +90 días.
- Tabla completa con filtros (`bucket`, `entity`, `brand`, `source`) deep-linkables.

Query: `src/lib/queries/financeDashboard/arAging.ts`. Fuente canónica de pagos: `invoice_payments`. Fallback de vencimiento: `issueDate + 30 días` si `dueDate=null` (etiquetado como "Vencimiento estimado").

---

## 5. Diferencia entre **pagos a talentos** y **gastos operativos**

**Pagos a talentos** = *coste directo de campaña*.

Cuando cobramos a una marca 1.000 € y pagamos 800 € al influencer, esos 800 € no son un "gasto de la empresa" al mismo nivel que gestoría o software. Son parte del coste directo del deal.

- `expenseGroup = 'campaign_direct'`
- `expenseSubtype = 'pago_talento'`
- Suelen tener `talentId` y `campaignId` no-nulos.
- Aparecen en el bloque **"Pagos a talentos"** dentro de `Costes directos` en el resumen y en el P&L.
- Restan del **margen bruto**, NO del resultado operativo directamente (van antes en la fórmula).

**Gastos operativos** = gastos reales de estructura de empresa:

- Gestoría, software/IA, hosting/dominio, seguro médico, comisiones bancarias/crypto, marketing, seguridad social (parte empresa), etc.
- `expenseGroup = 'operational'`
- No dependen de una campaña concreta.
- Aparecen en el bloque **"Gastos operativos"**.
- Restan del **resultado operativo**.

**Ejemplo real**: en la operación de JOSPO cobramos 500 € (id 76), pagamos 200 € al talento (id 77) — coste directo, `campaign_direct + pago_talento` — y 3,50 € de comisión bancaria (id 78) — gasto operativo, `operational + comision_bancaria`.

---

## 6. Diferencia entre **nóminas**, **impuestos/cargas** y **operativos**

Todos son `expenseGroup = 'operational'`, pero el resumen los separa en 3 bloques para dar contexto a dirección:

| Bloque | Subtypes incluidos | Concepto |
|---|---|---|
| **Nóminas socios** | `nomina_socio` | Dinero que los socios (Pablo, Alfonso) cobran como sueldo. Es gasto contable de la empresa pero también es liquidez que vuelve a los socios. |
| **Impuestos y cargas** | `cuota_autonomo`, `factura_autonomo`, `seguridad_social`, `fiscal_impuestos`, `ajuste_fiscal` | Cargas fiscales y previsionales — no son gastos "elegibles" ni operativos reales, son obligaciones. |
| **Gastos operativos** | `gestoria`, `suscripcion_software`, `herramienta_ia`, `seguro_medico`, `comision_bancaria`, `comision_plataforma`, `marketing_publicidad`, `gasto_general`, hosting/dominio (detectado por regex) | Costes reales de operar la empresa. |

Detección Pablo/Alfonso en nóminas y cuotas: `detectPartner(concept + counterparty)` con regex `\b(pablo|camacho|keko)\b/i` y `\b(alfonso|arias)\b/i`. Guardarraíl: solo se aplica en subtipos partner-aware, nunca en `pago_talento`.

---

## 7. **Margen bruto**

Es lo que queda de los ingresos después de los costes directos de campaña.

```
margen bruto = ingresos − costes directos
```

Se calcula en dos variantes:

- **Cobrado** — `ingresosCobrados − costesDirectosPagados`. Base caja pura.
- **Pendiente estimado** — `pendienteCobrar − costesDirectosPendientes`.

Es el KPI clave para saber *cuánto de lo facturado sobrevive a los pagos a talentos*. No incluye nóminas, impuestos ni operativos — esos vienen después.

---

## 8. **Resultado operativo**

Es lo que queda **después de todo lo que la empresa paga cada mes**.

```
resultado operativo = margen bruto cobrado
                      − nóminas
                      − impuestos y cargas
                      − gastos operativos
```

Enfoque base caja: usa `margenBrutoCobrado` como base, no el pendiente. Refleja lo que efectivamente ha entrado y salido en el periodo, no lo aún por materializar.

El bloque incluye desplegable `<details>` con la fórmula desglosada línea a línea.

---

## 9. **Margen pendiente estimado**

Métrica de proyección para el bloque "Pendientes destacados":

```
margen pendiente estimado = cobros pendientes de campañas
                           − pagos pendientes a talentos
```

**No resta gastos operativos pendientes** porque esos no son costes de campaña — ya están capturados en `gastos operativos` del periodo. La cifra responde: *"si cobrara todo lo pendiente y pagara a todos los talentos pendientes, ¿cuánto margen bruto extra tendría?"*.

Verde si positivo, rojo si negativo.

---

## 10. Fuente canónica de pagos = `invoice_payments`

`invoice_payments` es la tabla que representa cada cobro/pago humano explícito (vinculando una `bank_transaction` con una `issued_invoice` o una `invoice` interna).

Todas las queries **nuevas** de Finanzas usan esta tabla:

| Query | Uso |
|---|---|
| `arAging.ts` | Cobros pendientes con `paidAmount = SUM(invoice_payments.amount)` para ambas fuentes. |
| `finanzasResumenV2.ts` | 7 queries paralelas, todas basadas en `invoice_payments` para cash. |
| `receivables.ts` | **Migrada 2026-07-02** — ambos paths (issued + internal) ahora usan `SUM(invoice_payments.amount)`. |
| `cashflow.ts` | Serie mensual de cobros reales. |
| `kpis.ts` | `cobradoRealMes = SUM(invoice_payments.amount)` del mes. |

Cualquier query nueva que calcule "cobrado" o "pagado" **debe** usar `invoice_payments`, nunca `invoices.paidAmount`.

### Convención: `status='pagada'` sin `invoice_payments`

En la práctica hay dos conceptos que **no son equivalentes**:

| Campo | Significado |
|---|---|
| `invoices.status` (o `issued_invoices.status`) | Estado **operativo/manual** de la factura o gasto. `'pagada'` / `'cobrada'` = el usuario declara que la operación se ha materializado desde su cuenta. |
| `invoice_payments` | **Fuente canónica de pagos conciliados** — cash real. Cada fila vincula la factura con una `bank_transaction` concreta a través del módulo de conciliación bancaria. |

**Ambas cosas pueden coexistir independientemente.** Un gasto marcado como `pagada` puede no tener fila en `invoice_payments` si nunca pasó por conciliación (nóminas importadas via wizard con status ya marcado, recurrentes backfilled con `status='pagada'`, correcciones manuales, etc.). Al 2026-07-02 hay **32 filas** en esa situación — todas gastos de estructura pagados desde el banco pero no conciliados.

**Efecto en las vistas del resumen:**

- Los bloques **Nóminas / Impuestos / Operativos / Resultado operativo** cuentan estas 32 filas correctamente (usan `SUM(totalAmount)` en accrual, no `invoice_payments`).
- Los KPIs **base caja** (ingresos cobrados, costes directos pagados, cashflow) sólo cuentan lo que tiene fila en `invoice_payments`. Como estas 32 filas son gastos operativos/nóminas/impuestos y no ingresos ni costes directos, no aplica.
- El módulo de conciliación (`/admin/facturacion/bancos/conciliacion`) no ve estas filas porque no tienen `bank_transaction_id` que las respalde.

**Regla de oro:** para cualquier métrica de tesorería/cash flow usar siempre `invoice_payments`. Para P&L accrual usar `SUM(totalAmount)` sobre `invoices` filtrado por `expenseGroup`/`expenseSubtype` y excluyendo `status='anulada'`.

Herramienta re-ejecutable para reauditar la consistencia: `scripts/audit-finanzas-consistency.ts` (ver informe en `docs/finance-audit-2026-07-02.md`).

---

## 11. `invoices.paidAmount` deprecated

El schema marca `invoices.paidAmount` con `@deprecated` explícito. Es una columna heredada que se mantenía sincronizada por Server Actions al aplicar `invoice_payments`, pero no debe usarse como fuente en queries nuevas.

**Estado (2026-07-02):**

- ✅ Queries de dashboard nuevas: **cero uso** de `paidAmount`.
- ✅ `receivables.ts` — migrada a `invoice_payments` (TD-14 cerrado).
- ✅ `pnl.ts` — dead SELECT de `paidAmount` eliminado.
- 🟨 **TD-14b (no accionable · decisión de diseño 2026-07-02)**: `src/lib/queries/invoices.ts::listInvoices()` mantiene `paidAmount: invoices.paidAmount` como **valor operativo/manual declarado por el usuario** (editable desde `InvoiceDrawer`). Tras auditar los 10 consumers de `listInvoices()`, se confirma que ninguno calcula "cobrado real" a partir de esa column — las vistas críticas de Finanzas ya usan `invoice_payments` en queries dedicadas. Si aparece necesidad futura de cash real en un listado genérico, crear función paralela `listInvoicesWithPayments()`, **no** modificar `listInvoices()`. Ver `docs/tech-debt.md` § TD-14b.

---

## 12. Gastos recurrentes activos

Plantillas en `recurring_expenses` que el cron mensual genera automáticamente. Al confirmar `2026-07-02`:

| id | name | amount | dayOfMonth | startDate | subtype | active |
|---|---|---:|---:|---|---|:---:|
| 1 | Cuota autónomo — Keko | 315 € | 1 | 2026-01-01 | (null) | ❌ inactive (legacy) |
| 2 | Cuota autónomo — Zack | 315 € | 1 | 2026-01-01 | (null) | ❌ inactive (legacy) |
| **3** | **Cuota autónomo — Pablo** | **315 €** | **29** | **2026-07-01** | `cuota_autonomo` | ✅ |
| **4** | **Seguro médico — Alfonso** | **54 €** | **1** | **2026-01-01** | `seguro_medico` | ✅ |
| **5** | **Gestoría** | **185 €** | **29** | **2026-01-01** | `gestoria` | ✅ |

Los 3 activos (**id=3, 4, 5**) tienen `expenseGroup='operational'` y `expenseSubtype` asignado.

**Idempotencia:** cada invoice generada lleva `txId = 'recurring:{templateId}:{YYYY-MM}'`. Si el cron corre dos veces el mismo mes, la segunda hace skip.

**Backfill histórico ya aplicado:**

- Alfonso seguro médico ene-jun 2026 (ids 93-98) — status `pagada`.
- Gestoría ene-jul 2026 (ids 101-107) — ene-jun `pagada`, jul `pendiente`.
- Pablo cuota autónomo ene-jun 2026 (ids 81-86) creadas manualmente sin `txId`. Julio (id=99) creada por script one-off `apply-recurring-julio-2026.ts` con `txId=recurring:3:2026-07`.
- Alfonso seguro médico jul 2026 (id=100) creada por el mismo script one-off con `txId=recurring:4:2026-07`.

Alfonso cuota autónomo — **desactivada intencionalmente**. Ya no la paga. Las 6 filas históricas (ids 64-69) generadas por la plantilla id=1 se mantienen para el histórico.

---

## 13. Cron `generate-recurring-expenses`

**Ruta**: `/api/cron/generate-recurring-expenses`

**Schedule** (`vercel.json`, activo desde 2026-07-01):

```json
{
  "path": "/api/cron/generate-recurring-expenses",
  "schedule": "0 3 * * *"
}
```

Corre **diario a las 03:00 UTC**. La ruta es idempotente por `txId=recurring:{templateId}:{YYYY-MM}`; correr diario permite:

- Cubrir plantillas creadas a mitad de mes o después del día 1.
- Recuperarse de fallos puntuales sin esperar al mes siguiente.
- Cero riesgo de duplicados (SELECT antes de INSERT).

**Auth**: `assertCronAuth(req)` exige `Authorization: Bearer ${CRON_SECRET}` con `timingSafeEqual`. Test estático en `src/__tests__/server/vercel-crons-schedule.test.ts` verifica que el schedule está registrado y que el guard sigue intacto.

**Lógica**:

1. `getActiveTemplatesForMonth('YYYY-MM')` — plantillas activas con `startDate ≤ mesActual` y `endDate = null` o `≥ mesActual`.
2. Para cada plantilla, `invoiceExistsForMonth(templateId, monthStr)` — skip si ya existe.
3. `createInvoiceForMonth(template, monthStr)` — INSERT con `status='pendiente'`, `issueDate = min(dayOfMonth, lastDayOfMonth)`, `txId` canónico, importe `totalAmount = netAmount × (1 + (vatPct - withholdingPct)/100)`.

---

## Nav de Finanzas

Tabs dentro de `/admin/finanzas/*` (`FinanzasNav.tsx`):

```
Resumen               → /admin/finanzas/resumen  (home CEO YTD)
Control mensual       → /admin/finanzas/mes
Cobros pendientes     → /admin/finanzas/cobros
Histórico mensual     → /admin/finanzas/pl
Gastos y clasificación → /admin/finanzas/gastos
Importar documentos   → /admin/finanzas/herramientas
```

Sidebar admin sigue apuntando `Finanzas → /admin/finanzas/resumen`.

---

## Archivos clave

```
src/app/admin/(dashboard)/finanzas/
  resumen/page.tsx                RSC — nueva home YTD (PR B/3 rediseño)
  mes/page.tsx                    RSC — control mensual movido aquí
  pl/page.tsx                     RSC — histórico mensual
  cobros/page.tsx                 RSC — AR aging
  gastos/page.tsx                 RSC — clasificación de gastos
  herramientas/                   Setup, importar, nóminas

src/lib/queries/financeDashboard/
  finanzasResumenV2.ts            server-only — query principal del resumen YTD
  finanzasResumenV2.shared.ts     pure — clasificadores y agregadores
  arAging.ts                      server-only — cobros AR aging
  arAging.shared.ts               pure — clasificación bucket
  expenseSubgroups.ts             pure — 17 subgrupos + detección Pablo/Alfonso
  pnlDetail.ts                    server-only — P&L YTD
  receivables.ts                  server-only — receivables (widget /mes)
  cashflow.ts                     server-only — serie mensual caja
  kpis.ts                         server-only — KPIs agregados
  reconciliation.ts               server-only — conciliación bancaria
  recurringExpenses.ts            (server) plantillas + createInvoiceForMonth
  index.ts                        composición getFinanceDashboard()

src/features/admin/finance-dashboard/components/
  resumen-v2/                     8 componentes RSC + 1 client (ResumenFilters)
  FinanceMonthlyControl.tsx       (client) — control mensual
  ReceivablesTable.tsx            (client) — widget cobros pendientes
  ArAgingTable.tsx                (RSC) — tabla AR aging
  ArAgingFilters.tsx              (client) — filtros AR aging

src/features/admin/pnl/components/
  AnnualExpenseBreakdown.tsx      (RSC) — bloque "Dónde se ha ido el dinero"
  PnLOverviewCards.tsx            (RSC) — 8 KPI cards
  PnLBreakdownTable.tsx           (RSC) — desglose mensual
  PnLFilters.tsx                  (client) — filtros /pl

src/app/api/cron/generate-recurring-expenses/route.ts
  GET — invocado diario por Vercel (0 3 * * * UTC), protegido por CRON_SECRET

vercel.json                       Registro de crons (incluye recurring desde jul/2026)

docs/tech-debt.md                 TD-14 cerrado, TD-14b decisión de diseño
```

---

## Estado tras el rediseño (julio 2026)

- ✅ Resumen YTD con selector `from/to` y bloque de pendientes destacados.
- ✅ Control mensual conservado en `/mes`.
- ✅ Cobros AR aging con filtros.
- ✅ Bloque expandible "Dónde se ha ido el dinero" con subtotales por categoría.
- ✅ Cron de recurrentes activo diario, plantillas Pablo cuota + Alfonso seguro + Gestoría en marcha.
- ✅ Fuente canónica `invoice_payments` en todas las queries relevantes; `paidAmount` deprecated eliminado de queries de dashboard.
- 🟨 TD-14b: `listInvoices()` genérico mantiene `paidAmount` como valor manual — decisión de diseño (2026-07-02) tras auditar 10 consumers. No accionable.

Cierre del bloque de rediseño de Finanzas de la semana del 2026-07-01.
