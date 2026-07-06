# Auditoría técnica del módulo Finanzas — 2026-07-06

> **Estado**: PR 1 de la fase de rediseño de Finanzas. Este documento es la
> línea base a partir de la cual se implementa PR 2 (rediseño de navegación +
> Resumen v3). Guardar en repositorio para trazabilidad.

## 1. Mapa de rutas actuales

```
/admin/facturacion                     — página compuesta (Movimientos + Importar + Facturas emitidas + Clientes + Emisoras)
/admin/facturacion/dashboard           — permanentRedirect → /admin/finanzas/resumen
/admin/facturacion/import              — importar PDF de factura (IA extrae datos)
/admin/facturacion/exports             — exports
/admin/facturacion/bancos              — cuentas bancarias
/admin/facturacion/bancos/importar     — importador wizard CSV/XLSX
/admin/facturacion/bancos/conciliacion — conciliación bancaria (TransactionReviewList + MatchedTransactionList)

/admin/finanzas/resumen                — Resumen económico v2 (bloques Ingresos/CostesMargen/Nóminas/Impuestos/Operativos/Resultado/Pendientes)
/admin/finanzas/mes                    — Control mensual (FinanceMonthlyControl con flow + stock + breakdown + docs + alerts)
/admin/finanzas/cobros                 — AR Aging (cobros pendientes)
/admin/finanzas/pl                     — Histórico anual P&L
/admin/finanzas/gastos                 — Tabla gastos (directos + operativos + sin clasificar)
/admin/finanzas/gastos-operativos      — Subvista de gastos operativos
/admin/finanzas/costes                 — Subvista de costes directos
/admin/finanzas/herramientas           — Landing "importar nóminas" + "setup gastos 2026"
/admin/finanzas/nominas/importar       — Wizard OCR de nóminas ELEVATEX
/admin/finanzas/setup-2026             — Wizard carga masiva gastos operativos 2026

/admin/gastos                          — Legacy redirect ¿? verificar
```

**FinanzasNav** hoy expone 6 tabs: `Resumen · Control mensual · Cobros pendientes · Histórico mensual · Gastos y clasificación · Importar documentos`. Falta: **Ingresos**, **Nóminas y creadores**, **Rentabilidad**, **Documentos**, **Informes**, **Configuración**, **Caja**.

Además existe una ruta paralela `/admin/facturacion` con Movimientos/Importar/Facturas/Clientes/Emisoras — semánticamente es "Ingresos + Configuración" pero fuera del layout de `/admin/finanzas/`. **Duplicación conceptual**.

## 2. Componentes existentes

**`src/features/admin/`:**
- `finance-dashboard/components/`: 12 componentes — ArAging* (4), FinanceAlertsList, FinanceMonthlyControl, FinanceResumenBlocks, BulkClassifyPanel, ExpenseClassifyInline, ExpensesClassifyTable, ReceivablesTable.
- `finance-dashboard/components/resumen-v2/`: 9 bloques (Ingresos, CostesMargen, Nóminas, Impuestos, Operativos, Resultado, Pendientes, SectionCard, Filters).
- `pnl/components/`: 5 componentes (Overview, Breakdown, CategoryList, Filters, AnnualExpenseBreakdown).
- `finance-payroll/`: PayrollImportWizard + client-ocr.
- `finance-setup/`: Setup2026Wizard.
- `invoices/components/`: InvoicesManager, IssuedInvoicesTab, AccountingImporter, BillingClientsManager, IssuersManagerTab.

**Total:** ~35 componentes con nombres inconsistentes. Sin design system unificado.

## 3. Tablas de DB usadas

| Tabla | Rol | Filas |
|---|---|---:|
| `invoices` | Facturas internas (income + expense) | 78 |
| `issued_invoices` | Facturas emitidas oficiales (con IVA, retención, PDF, rectificativas) | 1 |
| `issued_invoice_lines` | Líneas de las facturas emitidas | — |
| `billing_clients` | Clientes de facturación | 7 |
| `issuer_companies` | Empresas emisoras | 3 |
| `invoice_payments` | Pagos aplicados desde conciliación | **0** |
| `bank_accounts` | Cuentas bancarias | **0** |
| `bank_imports` | Importaciones CSV/XLSX | — |
| `bank_transactions` | Movimientos bancarios | **0** |
| `transaction_matches` | Matches sugeridos/aprobados/rechazados | — |
| `bank_reconciliation_events` | Log de auditoría | — |
| `invoice_imports` / `templates` / `parser_templates` | Importaciones + plantillas | — |
| `recurring_expenses` | Gastos recurrentes | 5 |
| `contracts` + `contract_templates` + `generated_contracts` | Contratos | — |
| `files` | Adjuntos polimórficos | — |

**Nóminas**: guardadas como `invoices` con `expense_subtype = 'nomina_socio' | 'seguridad_social'`. No hay tabla dedicada.
**Pagos a talentos**: `invoices` con `talent_id` + `expense_subtype = 'pago_talento'`. No hay tabla dedicada.

## 4. Queries actuales

Total ~4.618 LOC entre 20+ archivos en `src/lib/queries/financeDashboard/`, `src/lib/queries/invoices.ts`, `pnl.ts`, `bankReconciliation*.ts`, etc.

Principales agregadores:
- `getFinanceDashboardKPIs` — KPIs globales
- `getFinanzasResumenV2` — Resumen v2
- `getMonthlyFinanceFlow` + `getFinanceStockKPIs` — Control mensual
- `getArAging` — Aging cobros
- `getCashflowSeries(12)` — 12 meses income vs expense (issueDate, NO caja real)
- `getCampaignMargins` — Márgenes
- `deriveAlerts` — Alertas derivadas
- `getFinancePnL` — P&L detallado
- `getBillingKPIs` — KPIs facturación (invoices.ts)
- `getBankReconciliationKpis` — KPIs conciliación

## 5. Métricas ya existentes (producción)

- Facturado / Gastado / Margen neto / Pendiente cobro / Pendiente pago
- Gastos campaña vs empresa · Beneficio neto
- Cobrado real del mes (via `invoice_payments`) — **hoy = 0** por falta de datos bancarios
- Pagos pendientes de aplicar · Movimientos sin conciliar
- Cashflow 12 meses · Aging 4 buckets · Campaign margins (umbral 20%)
- Alerts derivadas · Nóminas mensuales · Impuestos operativos · Resultado neto estimado
- P&L por company × brand × talent × rango · Annual expense breakdown

## 6. Importadores

1. **PDF facturas** — `/admin/facturacion/import` con IA.
2. **Excel/CSV** — `AccountingImporter`.
3. **Extractos bancarios** — `bancos/importar` con hash + CSV/XLSX.
4. **Nóminas ELEVATEX PDF** — OCR client-side.
5. **Setup gastos 2026** — carga masiva histórica.

## 7. Estados de factura

**`invoices.status`** — enum con **12 valores** (⚠️ deuda técnica):

`borrador · emitida · cobrada · vencida · anulada · pagada · parcial · no_cobrada · no_pagada · no_cobrado · no_pagado · pendiente`

Problemas: duplicados semánticos (`no_cobrada` vs `no_cobrado`), solapamientos (`pendiente`/`no_pagada`), sin criterio claro. **Normalización diferida a PR aparte** — requiere migración con backfill de 78 filas.

**`issued_invoices.status`** — varchar libre (no enum), default `'borrador'`.

**Bank tx**: `imported · matched · ignored · needs_review`.
**Match**: `suggested · approved · rejected`.

## 8. Relaciones factura ↔ marca ↔ trato ↔ talento ↔ campaña

Ambas facturas (`invoices`, `issued_invoices`) tienen FKs a `crmBrands`, `talents`, `campaigns` (deals). En `issued_invoices` el campo se llama `related_deal_id → campaigns.id`.

Reglas actuales:
- `invoice.expenseGroup = campaign_direct` + `campaignId != null` → coste directo campaña.
- `invoice.expenseGroup = operational` → gasto operativo.
- `invoice.expenseGroup IS NULL` **AND** `campaignId IS NULL` → operativo por fallback.
- Hoy 11/52 (21%) gastos sin clasificar.

## 9. Datos reales vs mock

**Reales:**
- 78 invoices (26 income + 52 expense)
- 1 factura emitida por 1.000€
- 7 clientes billing, 3 empresas emisoras
- 5 gastos recurrentes
- 11 gastos sin clasificar

**Vacío en producción:**
- 0 bank_accounts / 0 bank_transactions / 0 invoice_payments

⚠️ Consecuencia: KPIs de "cobrado real" muestran 0 hasta que se importen movimientos bancarios.

## 10. Problemas UX detectados

1. Duplicación de rutas `/facturacion` ↔ `/finanzas`.
2. Naming inconsistente entre secciones.
3. Enum `status` con 12 valores duplicados/solapados.
4. Cobrado real siempre 0 sin aviso al usuario.
5. Nóminas mezcladas con gastos, sin sección propia.
6. Pagos a talentos sin vista dedicada.
7. No hay sección Caja (cashflow ≠ dinero real).
8. Rentabilidad enterrada en Control mensual.
9. No hay centro documental.
10. No hay Informes con exportación unificada.
11. No hay Configuración de categorías (hardcoded en enum).
12. Filtros no persistentes.
13. Tests parciales por sección.
14. Rutas legacy dead-end.

## 11. Riesgos técnicos

- **Alto — enum `invoice_status`**: normalizar requiere migración + backfill + refactor de 4-6 queries. Diferido.
- **Medio — desconectar `/admin/facturacion`**: rutas legacy con bookmarks. Solución: redirects.
- **Medio — legacy `paidAmount` en invoices**: marcado `@deprecated` pero aún leído.
- **Bajo — nóminas como tabla dedicada**: 8 filas actuales `nomina_socio`. Barato pero opcional.
- **Bajo — `recurring_expenses` sin integración con dashboard**.

## 12. Cambios posibles sin tocar DB

Fase 2 se puede hacer **100% sin migración**:

- Nueva `FinanzasNav` con 9 tabs.
- Placeholder pages "Próximamente" donde falte desarrollo.
- Legacy redirects (`/admin/facturacion → /admin/finanzas/ingresos`, etc.).
- Rediseño `Resumen` con "Lectura rápida" + "Alertas" en la parte superior.
- Gráficos con `recharts` (ya en dependencies).
- Aviso "Sin datos bancarios importados" cuando `invoice_payments = 0`.
- Filtros persistentes con helper unificado.

## 13. Decisiones aprobadas (2026-07-06)

| Decisión | Estado |
|---|---|
| Librería de gráficos | ✅ `recharts` |
| Absorber `/admin/facturacion` bajo `/admin/finanzas/ingresos` | ✅ con redirects |
| Enum `invoice_status` legacy | ⏭️ diferido a PR aparte |
| Cobrado real / bank data | ✅ aviso visual, no esconder KPIs |
| Nóminas sección propia | ✅ `/admin/finanzas/nominas-creadores`, reutilizando `invoices` |
| Pagos a talentos | ✅ subsección de "Nóminas y creadores", reutilizando `invoices` |
| Migraciones | 🚫 **prohibidas en PR 2** |
| Tablas nuevas | 🚫 **prohibidas en PR 2** |

## 14. Alcance de PR 2

**Tabs canónicas (nueva FinanzasNav):**

```
Resumen · Caja · Ingresos · Gastos · Nóminas y creadores · Rentabilidad · Documentos · Informes · Configuración
```

**Redirects legacy (permanentRedirect):**

```
/admin/facturacion → /admin/finanzas/ingresos
/admin/facturacion/dashboard → /admin/finanzas/resumen
/admin/gastos → /admin/finanzas/gastos
```

**Jerarquía Resumen v3:**

1. Filtros
2. KPIs principales
3. Aviso si falta bank data (`invoice_payments = 0`)
4. Lectura rápida
5. Alertas inteligentes
6. Gráficos (4 prioritarios: Ingresos vs Gastos por mes · Facturado vs Cobrado · Gastos por categoría · Aging)
7. Bloques de detalle existentes v2

**Fuera de scope PR 2:**
- Cualquier migración de schema.
- Normalizar `invoice_status`.
- Cambiar importes.
- Marcar facturas cobradas/pagadas automáticamente.
- Borrar rutas sin redirect.
- Crear tablas nuevas.
- Mover datos.
- Añadir dependencias nuevas.
