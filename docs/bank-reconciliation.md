# Bank Reconciliation Module — Documentación

## Overview

Módulo de conciliación bancaria manual dentro del CRM (`/admin/facturacion/bancos`). Permite importar extractos CSV/XLSX, deduplicar transacciones y aprobar/rechazar conciliaciones manualmente. **Sin conexiones a APIs bancarias reales.**

## Rutas

| Ruta | Descripción |
|---|---|
| `/admin/facturacion/bancos` | Lista de cuentas + KPIs globales |
| `/admin/facturacion/bancos/importar` | Wizard de importación CSV/XLSX |
| `/admin/facturacion/bancos/conciliacion` | Revisión y aprobación de conciliaciones |

## Permisos

Módulo `bancos` en `src/lib/permissions.ts`:
- `read`: admin, manager, finance
- `write`: admin, manager, finance
- `delete`: admin

## Flujo de importación

```
Usuario sube CSV/XLSX
        │
        ▼
[1] Validar archivo (MIME, extensión, magic bytes, tamaño ≤ 6MB)
        │
        ▼
[2] analyzeImportFileAction → parsear headers → sugerir mapping de columnas
        │
        ▼
[3] Usuario confirma/ajusta mapping en UI
        │
        ▼
[4] uploadAndImportAction:
     ├─ hashFile(file) → dedup por (fileHash, bankAccountId)
     ├─ applyBankMapping → ParsedBankRow[]
     ├─ createBankImport (status: pending)
     ├─ Para cada fila:
     │   ├─ hashTransaction → dedup por (txHash, bankAccountId)
     │   ├─ sanitizeBankRawJson (enmascara IBANs/emails antes de guardar)
     │   └─ createBankTransaction (status: imported)
     └─ updateBankImport (status: processed, importedRows, duplicateRows)
```

## Deduplicación

Dos niveles de dedup:
1. **Archivo**: `UNIQUE(file_hash, bank_account_id)` en `bank_imports` — mismo archivo no se procesa dos veces.
2. **Transacción**: `UNIQUE(transaction_hash, bank_account_id)` en `bank_transactions` — misma transacción no se importa dos veces.

### Hash de transacción

```
sha256(bankAccountId | normalizedDate | amount | currency | normalizedDesc | ref | counterparty)
```

Normalización: fecha a ISO `YYYY-MM-DD`, descripción/ref/contraparte a lowercase sin espacios extra.

## Scoring de conciliación

Motor en `src/lib/services/bank-reconciliation/matcher.ts`:

| Criterio | Puntos |
|---|---|
| Importe exacto | +50 |
| Importe ±1€ | +20 |
| Misma fecha | +20 |
| Fecha ±3 días | +10 |
| Nombre contiene coincidencia | +15 |
| Referencia coincide | +15 |
| Dirección incorrecta (income ≠ expense) | -100 |

Umbral mínimo: 50 puntos. `scoreMatches()` retorna candidatos ordenados por confidence desc.

**Dirección obligatoria**: `issued_invoice` solo coincide con transacciones `income`; expenses solo con `expense`.

## Candidatos integrados en UI

`src/lib/queries/bankReconciliationCandidates.ts` — función `getCandidatesForTransactions()`:

**Fuentes de candidatos por dirección:**

| Dirección | Fuente | matchType |
|---|---|---|
| `income` | Facturas emitidas (`issued_invoices`) con status `emitida`/`vencida` | `issued_invoice` |
| `income` / `expense` | Facturas internas (`invoices`) no cobradas/pagadas/anuladas/borrador | `internal_invoice` |
| `expense` | Gastos recurrentes (`recurring_expenses`) activos | `expense` |

**Estrategia batch**: una sola página de transacciones genera 4 queries en paralelo (issuedInvoices, invoices, recurringExpenses, rejected matches). El scoring se ejecuta en memoria — sin N+1.

**Rango temporal**: ±30 días alrededor de la fecha de la transacción para facturas. Los gastos recurrentes se incluyen sin filtro de fecha (la fecha se construye per-transacción: `dayOfMonth` del mes del extracto).

**Candidatos rechazados**: los matches rechazados se persisten en `transaction_matches` (status: `rejected`) y se excluyen de futuros candidatos via dedup key `${matchType}:${entityId}`.

**Aprobar/Rechazar**: atómico via `db.transaction()` — inserta `transaction_matches` y actualiza `bank_transactions.status` en la misma transacción DB.

| Confidence | Etiqueta |
|---|---|
| 80-100 | Alta confianza |
| 60-79 | Media |
| 50-59 | Baja |

Máximo 5 candidatos por transacción (ordenados por confidence desc).

## Sanitización de datos sensibles

`sanitizeBankRawJson()` se aplica a `rawJsonSanitized` **antes de escribir en BD**:
- Enmascara IBANs, emails, NIF/CIF en strings
- Redacta claves `password`, `token`, `iban`, `secret`, etc.
- Trunca strings a 400 chars
- Limita arrays a 25 filas

## Tablas de BD

| Tabla | Descripción |
|---|---|
| `bank_accounts` | Cuentas bancarias registradas |
| `bank_imports` | Archivos CSV/XLSX importados |
| `bank_transactions` | Transacciones individuales |
| `transaction_matches` | Sugerencias y aprobaciones de conciliación |
| `bank_reconciliation_events` | Audit log de todas las acciones |

Migración: `drizzle/0091_real_harrier.sql`

## AI Tools (solo lectura)

| Tool | Descripción |
|---|---|
| `getBankReconciliationSummary` | KPIs: total, sin conciliar, conciliadas, tasa |
| `getUnmatchedBankTransactions` | Hasta 25 transacciones sin conciliar |
| `getSuggestedTransactionMatches` | Top candidato por transacción sin conciliar (hasta 25) |

Las tres herramientas están en `AVAILABLE_TOOLS` y en el allowlist del orquestador two-pass.

## Archivos clave

```
src/db/schema/bankReconciliation.ts          — 5 tablas + 8 enums
src/types/bankReconciliation.ts              — tipos derivados de Drizzle + ScoredCandidate
src/lib/queries/bankReconciliation.ts        — CRUD + KPIs + approveMatchFromCandidate/rejectMatchFromCandidate
src/lib/queries/bankReconciliationCandidates.ts — getCandidatesForTransactions() batch scoring
src/lib/parsers/bankTransaction.ts           — CSV/XLSX parsing + hash + sanitize
src/lib/services/bank-reconciliation/
  matcher.ts                                 — scoring engine (MatchCandidate, MatchResult, scoreMatches)
src/lib/services/ai-assistant/tools/
  bankReconciliation.ts                      — 3 AI tools de solo lectura (candidatos reales)
src/lib/schemas/bankReconciliation.ts        — Zod schemas: approve/reject from candidate
src/app/admin/(dashboard)/facturacion/bancos/
  page.tsx + BankAccountForm.tsx             — lista cuentas
  importar/page.tsx + BankImportWizard.tsx   — wizard importación
  importar/import-actions.ts                 — server actions importación
  bancos/actions.ts                          — crear/eliminar cuentas
  conciliacion/page.tsx                      — lista transacciones + candidatos (RSC)
  conciliacion/TransactionReviewList.tsx     — candidatos con badges, aprobar/rechazar
  conciliacion/actions.ts                    — approveMatchAction/rejectMatchAction/ignoreTransactionAction
src/__tests__/server/bank-reconciliation.ts  — 35 tests unitarios
```

## Aplicar cobro/pago a factura

Segundo paso explícito tras aprobar una conciliación. **Aprobar match ≠ aplicar cobro.**

### Flujo

```
Transacción matched (tab "Conciliadas")
        │
        ▼
[UI] Botón "Aplicar cobro" / "Aplicar pago" (deshabilitado si matchType = expense)
        │
        ▼
[Panel confirmación inline] — fecha de pago, notas opcionales
        │
        ▼
applyPaymentAction → applyPaymentToIssuedInvoice / applyPaymentToInternalInvoice
        │
        ├─ INSERT invoice_payments (idempotencia por UNIQUE constraint)
        ├─ SUM pagos → determinar status ('cobrada' / 'parcial' / 'pagada')
        ├─ UPDATE issued_invoices.status o invoices.paidAmount+status
        └─ INSERT bank_reconciliation_events (auditoría)
```

### Tabla invoice_payments

| Columna | Descripción |
|---|---|
| `bank_transaction_id` | FK → bank_transactions (NOT NULL) |
| `issued_invoice_id` | FK → issued_invoices (nullable) |
| `invoice_id` | FK → invoices (nullable) |
| `amount` | Importe aplicado (numeric 12,2) |
| `currency` | Moneda (varchar 3) |
| `payment_date` | Fecha del pago |
| `applied_by_user_id` | Usuario que aplicó |

**Idempotencia:** `UNIQUE(bank_transaction_id, issued_invoice_id)` y `UNIQUE(bank_transaction_id, invoice_id)`.

**Restricciones:** exactamente una FK de factura. Currency mismatch → error, sin conversión.

### Status resultante

| Tipo | Condición | Nuevo status |
|---|---|---|
| `issued_invoices` | totalPaid ≥ totalAmount - 0.005 | `cobrada` |
| `issued_invoices` | totalPaid < totalAmount | `parcial` |
| `invoices` (income) | paidAmount ≥ totalAmount | `cobrada` |
| `invoices` (expense) | paidAmount ≥ totalAmount | `pagada` |
| `invoices` (cualquiera) | paidAmount < totalAmount | `parcial` |

### Regla expense matchType

Los gastos recurrentes (`expense`) no tienen factura vinculable → botón "Aplicar pago" deshabilitado con tooltip "Próximamente".

### AI tool — getPendingPaymentMatches

Lee las transacciones `matched` cuyo cobro/pago aún no ha sido aplicado. Solo lectura.

```
getPendingPaymentMatches → hasta 25 transacciones pendientes de pago
```

### Archivos nuevos (migración 0092)

```
src/db/schema/invoicePayments.ts              — tabla invoice_payments
src/types/invoicePayment.ts                   — tipo InvoicePayment
src/lib/schemas/invoicePayments.ts            — applyPaymentSchema (Zod)
src/lib/queries/invoicePayments.ts            — applyPaymentToIssuedInvoice / applyPaymentToInternalInvoice
src/lib/queries/bankReconciliationMatched.ts  — getMatchedTransactionsWithPaymentStatus
src/app/.../conciliacion/paymentActions.ts    — applyPaymentAction (server action)
src/app/.../conciliacion/MatchedTransactionList.tsx — UI tab Conciliadas
src/__tests__/server/invoice-payments.test.ts — 24 tests
drizzle/0092_melodic_mentor.sql               — migración
```

## Límites actuales

- Importación manual únicamente — sin conexión a APIs bancarias reales
- La aprobación de conciliaciones es manual — no hay auto-aprobación
- El scoring se ejecuta on-demand (UI), no en batch al importar
- Máximo 25 transacciones en la AI tool de transacciones sin conciliar
- Archivos hasta 6 MB (herencia de `next.config.ts` `bodySizeLimit`)
