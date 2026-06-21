# Handoff — Conciliación bancaria: candidatos integrados + Aplicar cobro/pago

**Sesión:** 2026-06-21  
**Estado al cerrar:** candidatos integrados en UI (completo), feature "Aplicar cobro/pago" en implementación.

---

## 1. Qué se implementó esta sesión

### Candidatos de conciliación en UI (COMPLETO)

Flujo completo de aprobación/rechazo con candidatos reales desde `/admin/facturacion/bancos/conciliacion`:

| Capa | Archivo | Estado |
|---|---|---|
| Tipos RSC-safe | `src/types/bankReconciliation.ts` (`ScoredCandidate`, `BankTransactionWithCandidates`) | ✅ |
| Batch scoring | `src/lib/queries/bankReconciliationCandidates.ts` | ✅ |
| Queries atómicas | `src/lib/queries/bankReconciliation.ts` (`approveMatchFromCandidate`, `rejectMatchFromCandidate`) | ✅ |
| Schemas Zod | `src/lib/schemas/bankReconciliation.ts` (`approveMatchFromCandidateSchema`, `rejectMatchFromCandidateSchema`) | ✅ |
| Server actions | `src/app/.../conciliacion/actions.ts` | ✅ |
| RSC page | `src/app/.../conciliacion/page.tsx` | ✅ |
| UI client | `src/app/.../conciliacion/TransactionReviewList.tsx` | ✅ |
| AI tool `getSuggestedTransactionMatches` | `src/lib/services/ai-assistant/tools/bankReconciliation.ts` | ✅ |
| Docs | `docs/bank-reconciliation.md` | ✅ |

Tests: 79 tests pasan (35 bank-reconciliation + 44 ai-assistant).

### Aplicar cobro/pago a factura (EN PROGRESO)

Implementación iniciada en continuación de sesión. Ver plan completo abajo.

---

## 2. Feature pendiente — Aplicar cobro/pago a factura

Flujo dos pasos: **aprobar match ≠ aplicar cobro**. El botón "Aplicar cobro/pago" es acción humana separada y explícita.

### Diseño decidido

- **Tabla nueva:** `invoice_payments` (migración 0092). No existía.
- **`issuedInvoices` no tiene `paidAmount`** → derivar sumando `invoice_payments` en cada operación.
- **`invoices` tiene `paidAmount`** → actualizar directamente + `invoice_payments` para auditoría.
- **`expense` matchType** → botón deshabilitado con tooltip "Próximamente".
- **Idempotencia** → `UNIQUE(bank_transaction_id, issued_invoice_id)` y `UNIQUE(bank_transaction_id, invoice_id)`.
- **Currency mismatch** → error claro, sin conversión automática.
- **Auditoría** → insertar en `bank_reconciliation_events.metadata`.
- **Status issuedInvoices** → `parcial` (varchar(30)) o `cobrada`.
- **Status invoices** → usa `invoiceStatusEnum` existente que ya incluye `parcial`, `cobrada`, `pagada`.

### Plan de archivos

```
1. src/db/schema/invoicePayments.ts          — schema nueva tabla
2. src/db/schema/index.ts                    — export
3. npx drizzle-kit generate && npm run migrate  — migración 0092
4. src/types/invoicePayment.ts               — tipos derivados de Drizzle
5. src/lib/schemas/invoicePayments.ts        — Zod applyPaymentSchema
6. src/lib/queries/invoicePayments.ts        — apply / getPayments queries
7. src/lib/queries/bankReconciliationMatched.ts  — getMatchedTransactionsWithPaymentStatus
8. src/lib/queries/bankReconciliationCandidates.ts  — añadir 'parcial' al filtro issuedInvoices
9. src/app/.../conciliacion/paymentActions.ts   — server action
10. src/app/.../conciliacion/page.tsx           — tab "Conciliadas"
11. src/app/.../conciliacion/MatchedTransactionList.tsx  — UI
12. src/lib/services/ai-assistant/tools/bankReconciliation.ts  — getPendingPaymentMatches
13. src/lib/services/ai-assistant/guardrails.ts — patrones apply-payment
14. src/__tests__/server/invoice-payments.test.ts — tests
15. docs/bank-reconciliation.md              — sección nueva
```

---

## 3. Tests actuales

- `src/__tests__/server/bank-reconciliation.test.ts` — 35 tests (scoring, parser, hash, sanitize, matcher)
- `src/__tests__/server/ai-assistant.test.ts` — 44 tests (guardrails, mask, sanitize, AI tools)
- `invoice-schema.test.ts` tiene 37 fallos **preexistentes** — no tocar.

---

## 4. Archivos modificados en esta sesión

```
src/types/bankReconciliation.ts
src/lib/queries/bankReconciliation.ts
src/lib/queries/bankReconciliationCandidates.ts  (nuevo)
src/lib/schemas/bankReconciliation.ts
src/app/admin/(dashboard)/facturacion/bancos/conciliacion/actions.ts
src/app/admin/(dashboard)/facturacion/bancos/conciliacion/page.tsx
src/app/admin/(dashboard)/facturacion/bancos/conciliacion/TransactionReviewList.tsx
src/lib/services/ai-assistant/tools/bankReconciliation.ts
src/__tests__/server/ai-assistant.test.ts
docs/bank-reconciliation.md
```

---

## 5. Decisiones técnicas

| Decisión | Motivo |
|---|---|
| `rejectedKeys: readonly string[]` en lugar de `Set` | Sets no serializan sobre RSC boundary |
| `date: string` (ISO) en `ScoredCandidate` | `Date` no serializa en RSC |
| `substring(0, 10)` en lugar de `.split('T')[0]!` | ESLint prohíbe non-null assertions |
| `db.transaction()` en approve/reject | Atomicidad: insert match + update tx status |
| Candidatos on-demand | Permite recalcular si llegan facturas nuevas |
| `expense` → botón deshabilitado | Gastos recurrentes sin factura vinculable |

---

## 6. Riesgos

- **issuedInvoices sin paidAmount**: status se recalcula sumando invoice_payments. Si se borra un pago directamente en BD, el status queda desincronizado.
- **'parcial' en issuedInvoices**: varchar(30), no enum. Filtro en `bankReconciliationCandidates.ts:42` debe incluirlo para que facturas parciales sigan siendo candidatas.
- **Deuda**: `invoice-schema.test.ts` con 37 fallos preexistentes — no tocar.

---

## 7. Comandos para ejecutar al retomar

```bash
npx drizzle-kit generate   # tras crear invoicePayments.ts + export en index.ts
npm run migrate            # aplicar migración 0092
npx tsc --noEmit           # verificar types
npm test                   # tras implementar tests
npm run lint               # check final
```
