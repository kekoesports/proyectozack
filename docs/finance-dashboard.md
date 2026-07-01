# Finance Dashboard — Documentación

## Estado (2026-07-01, Fase 1A.2)

**La home financiera principal es `/admin/finanzas/resumen`.**

La ruta legacy `/admin/facturacion/dashboard` **redirige de forma permanente** (308) a `/admin/finanzas/resumen`. Ya no debe usarse como URL de destino ni como referencia.

Bloques que vivían en la ruta legacy y que se han **diferido a fases futuras**:

| Bloque | Destino futuro |
|---|---|
| CashflowChart 12m | Fase 1B/3 — vive mejor en `/admin/finanzas/pl` (histórico) o widget dedicado. |
| ReconciliationPanel | Ya existe la vista completa en `/admin/facturacion/bancos/conciliacion`. |
| CampaignMarginsTable | Fase 2 — rentabilidad de campañas, no home financiera. |
| FinanceKPIGrid (10 KPIs técnicos) | Reemplazado por los 6 KPIs CEO-friendly de `/admin/finanzas/resumen`. |

Los componentes `FinanceKPIGrid.tsx`, `CashflowChart.tsx`, `ReconciliationPanel.tsx` y `CampaignMarginsTable.tsx` **han sido borrados**. Cuando alguna de las fases futuras los necesite se reescribirán limpios (o se recuperan del historial de git).

Las queries subyacentes **siguen exportadas** desde `src/lib/queries/financeDashboard/index.ts` porque `deriveAlerts()` y otras herramientas del asistente IA las consumen — ver más abajo.

## Ruta

| Ruta | Descripción |
|---|---|
| `/admin/finanzas/resumen` | **Home financiera principal (Fase 1A.1).** Control mensual CEO-friendly. |
| `/admin/facturacion/dashboard` | Redirect 308 → `/admin/finanzas/resumen`. |

## Arquitectura de datos (agregador `getFinanceDashboard`)

Sigue disponible y en uso por `/admin/finanzas/resumen` (alertas + receivables) y por las AI tools:

```
getFinanceDashboard()              ← composición en paralelo
  ├─ getFinanceDashboardKPIs()     ← kpis.ts
  ├─ getCashflowSeries(12)         ← cashflow.ts
  ├─ getReceivables()              ← receivables.ts
  ├─ getReconciliationSummary()    ← reconciliation.ts
  ├─ getCampaignMargins()          ← campaignMargins.ts
  └─ deriveAlerts() [in-memory]    ← alerts.ts (pure function)
```

## KPIs (`kpis.ts`)

| KPI | Fuente | Base |
|---|---|---|
| `cobradoRealMes` | SUM(invoice_payments.amount) del mes actual | Caja |
| `incomeTotal` | SUM(invoices.totalAmount) kind=income, no anulada | Devengado |
| `expenseTotal` | SUM(invoices.totalAmount) kind=expense, no anulada | Devengado |
| `netTotal` | incomeTotal − expenseTotal | Devengado |
| `beneficioNeto` | incomeSettled − expenseCampanaSettled − expenseEmpresaSettled | Devengado |
| `pendingCobro` | invoices income con status emitida/no_cobrada/pendiente | Devengado |
| `pendingPago` | invoices expense con status emitida/no_pagada/pendiente | Devengado |
| `gastosCampana` / `gastosEmpresa` | Por scope (campaign/company) | Devengado |
| `pendingApplyPayment` | bank_transactions matched LEFT JOIN invoice_payments WHERE ip.id IS NULL | — |
| `unconciliatedMovements` | bank_transactions con status='imported' | — |

## Cashflow mensual (`cashflow.ts`)

Serie de 12 meses con dos series:

| Serie | Descripción |
|---|---|
| `cobrado` | SUM(invoice_payments.amount) agrupado por `payment_date` — **base caja real** |
| `pagado` | SUM(invoices.totalAmount) kind=expense, no anulada, agrupado por `issue_date` — **base devengado** |

**Nota:** `pagado` usa base devengado porque el "apply payment" para gastos (`expense` matchType) está pendiente de implementar ("Próximamente"). En cuanto se implemente, habrá que actualizar `cashflow.ts` para usar `invoice_payments` en el lado de los gastos también.

## Cobros pendientes (`receivables.ts`)

UNION en memoria de dos fuentes:

| Fuente | Filtro de status | `paidAmount` |
|---|---|---|
| `issued_invoices` | `emitida`, `vencida`, `parcial` | SUM(invoice_payments.amount) via LEFT JOIN — calculado en query |
| `invoices` kind=income | `PENDING_INCOME_STATUSES` | Columna `paidAmount` directa |

Máximo 30 filas por fuente. Orden final: por `dueDate ASC` (nulls al final).

**issuedInvoices vs invoices:** Las facturas emitidas no tienen columna `paidAmount`; el importe pagado se calcula vía `invoice_payments` en la misma query con GROUP BY.

## Conciliación (`reconciliation.ts`)

Wrapper sobre `getBankReconciliationKpis()` + query adicional para `pendingApplyPayment` (matched sin invoice_payment). La UI operativa vive en `/admin/facturacion/bancos/conciliacion`.

## Márgenes campañas (`campaignMargins.ts`)

Wrapper sobre `getCampaignMarginSummary()` (de `tools/campaigns.ts`) con flag `isLow = computedMarginPct < 20`.

**Importante:** Los márgenes son sobre presupuesto estimado (`amountBrand`/`amountTalent`), NO sobre pagos reales.

## Alertas (`alerts.ts`)

Función pura — **sin queries adicionales**. Derivadas en memoria de los demás resultados:

| Tipo | Condición | Severidad |
|---|---|---|
| `overdue_receivable` | receivables con `isOverdue=true` | high si total > €5.000, medium en otro caso |
| `low_margin` | campaigns con `isLow=true` | medium siempre |
| `pending_apply_payment` | kpis.pendingApplyPayment > 0 | high si > 5, low en otro caso |
| `unreconciled` | reconciliation.importedUnmatched > 0 | medium si > 20, low en otro caso |

Orden de presentación: high → medium → low.

## AI Tools

5 herramientas (solo lectura), registradas en `tools/index.ts`:

| Tool | Descripción |
|---|---|
| `getFinanceDashboardSummary` | KPIs accrual + cash real + estado bancario |
| `getCashflowTrend` | Serie mensual 12 meses (cobrado cash + pagado devengado) |
| `getReceivablesRiskSummary` | Cobros vencidos y pendientes agrupados, top 5 vencidos |
| `getCampaignMarginAlerts` | Campañas con margen < 20% |
| `getFinanceAlerts` | Alertas derivadas del estado actual |

## Archivos

```
src/types/financeDashboard.ts
  FinanceDashboardKPIs, CashflowMonthPoint, ReceivableRow, CampaignMarginRow,
  ReconciliationSummary, FinanceAlert, FinanceDashboardData

src/lib/queries/financeDashboard/
  cashflow.ts        — getCashflowSeries(months)
  kpis.ts            — getFinanceDashboardKPIs()
  receivables.ts     — getReceivables()
  reconciliation.ts  — getReconciliationSummary()
  campaignMargins.ts — getCampaignMargins(), LOW_MARGIN_THRESHOLD
  alerts.ts          — deriveAlerts() [pure]
  index.ts           — getFinanceDashboard() + re-exports

src/lib/services/ai-assistant/tools/financeDashboard.ts
  getFinanceDashboardSummary, getCashflowTrend, getReceivablesRiskSummary,
  getCampaignMarginAlerts, getFinanceAlerts

src/app/admin/(dashboard)/facturacion/dashboard/page.tsx
  permanentRedirect → /admin/finanzas/resumen  (Fase 1A.2)

src/app/admin/(dashboard)/finanzas/resumen/page.tsx
  RSC — requirePermission('facturacion','read') + FinanceMonthlyControl (Fase 1A.1)

src/features/admin/finance-dashboard/components/
  FinanceMonthlyControl.tsx — control mensual CEO (6 KPIs + breakdown + docs)
  ReceivablesTable.tsx      — tabla cobros pendientes con isOverdue highlight
  FinanceAlertsList.tsx     — lista alertas por severidad
  FinanceResumenBlocks.tsx  — bloques reutilizables del resumen
  BulkClassifyPanel.tsx     — clasificación masiva de gastos
  ExpensesClassifyTable.tsx / ExpenseClassifyInline.tsx — clasificación individual

src/__tests__/server/finance-dashboard.test.ts
  22 tests — deriveAlerts (pure), LOW_MARGIN_THRESHOLD, ReceivableRow semantics,
  CampaignMarginRow isLow flag
```

## Permisos

Usa `requirePermission('facturacion', 'read')` — mismos roles que el módulo de facturación existente (admin, manager, finance).

## Límites

- Solo lectura — sin mutaciones desde la home financiera
- Sin conexiones bancarias externas (no Wise, Stripe, Open Banking)
- Sin auto-pagos ni auto-conciliación
- `pagado` en el cashflow es base devengado hasta que se implemente apply-payment para gastos
- Los márgenes de campaña son estimados (budget), no pagos reales
- Máximo 30 receivables por fuente (60 total)
- Moneda: EUR únicamente. Si hay registros en otra divisa, los totales pueden estar mezclados (no se hace conversión)
