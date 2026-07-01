# Auditoría de consistencia en Finanzas — 2026-07-02

**Tarea 4 del loop nocturno.** Auditoría read-only con `scripts/audit-finanzas-consistency.ts`. **Cero modificaciones de datos.**

## Resumen

9/10 checks limpios. 1 hallazgo semántico esperado.

```
✓  1. invoices activas sin expenseGroup o expenseSubtype (excluye income)   → 0
✓  2. expenses con scope='campaign' sin campaignId (activas)                 → 0
✓  3. expenseSubtype='pago_talento' sin talentId (activas)                   → 0
✓  4. income con scope='campaign' sin brandId o sin campaignId (activas)     → 0
✓  5. recurring_expenses active=true sin expenseSubtype                      → 0
✓  6. invoices status='vencida' sin dueDate                                  → 0
✓  7. invoices status='parcial' sin fila en invoice_payments                 → 0
✓  8. issued_invoices status='cobrada' sin invoice_payments                  → 0
⚠  9. invoices status='pagada' sin invoice_payments                          → 32
✓ 10. invoices con txId duplicado                                            → 0
```

Confirmado por CI:
- Todos los checks 1-8 y 10 en verde tras las correcciones aplicadas durante la semana del rediseño:
  - Reclasificación de 6 pagos a talento/fee → chequeo #1 en 0.
  - Reclasificación con `campaignId`/`talentId` → checks #2, #3 en 0.
  - `recurring_expenses` id=3 (Pablo cuota), id=4 (Alfonso seguro), id=5 (Gestoría) tienen `expenseSubtype` asignado → check #5 en 0.
  - Ninguna factura vencida sin dueDate → check #6 en 0.
  - Ningún duplicado por txId → check #10 en 0.

## Hallazgo único — Check #9

**32 invoices con `status='pagada'` sin fila correspondiente en `invoice_payments`.**

### Muestra representativa

```json
{"id":87, "issueDate":"2026-02-01", "concept":"Nómina CAMACHO CARRION PABLO 2026-02", "totalAmount":"1696.55", "kind":"expense", "status":"pagada"}
{"id":88, "issueDate":"2026-02-01", "concept":"Nómina ARIAS EPIFANIO ALFONSO 2026-02", "totalAmount":"1369.00", "kind":"expense", "status":"pagada"}
{"id":89, "issueDate":"2026-03-01", "concept":"Nómina CAMACHO CARRION PABLO 2026-03", "totalAmount":"1696.55", "kind":"expense", "status":"pagada"}
{"id":91, "issueDate":"2026-04-01", "concept":"Nómina CAMACHO CARRION PABLO 2026-04", "totalAmount":"1696.55", "kind":"expense", "status":"pagada"}
{"id":92, "issueDate":"2026-04-01", "concept":"Nómina ARIAS EPIFANIO ALFONSO 2026-04", "totalAmount":"1369.00", "kind":"expense", "status":"pagada"}
```

### Origen de las 32 filas

Todas son **gastos de estructura** creados o backfilleados durante la semana del rediseño:

- Nóminas ELEVATEX ene-abr 2026 importadas via wizard (ids 79-92 aprox).
- Cuota autónomo Pablo/Alfonso ene-jun 2026 (ids 64-69, 81-86) — cron/scripts históricos.
- Seguro médico Alfonso ene-jun 2026 (ids 93-98) — script backfill `setup-recurring-...`.
- Gestoría ene-jun 2026 (ids 101-106) — script backfill `setup-recurring-gestoria`.
- Fee JOSPO (id=78, 3,50 €) — reclasificado a `comision_bancaria`.
- Nómina Alfonso 2026-03 (id=90) — corregida vía script `fix-payroll-alfonso-marzo-2026`.

Todas se marcaron **directamente como `pagada`** al crearse (importador de nóminas, scripts backfill con `status='pagada'`) porque el usuario ya las había pagado desde la cuenta bancaria, pero **nunca pasaron por conciliación bancaria** para generar la fila en `invoice_payments`.

### Análisis de impacto

Para las queries del resumen V2:

| Bloque | ¿Ve las 32 filas? | Efecto |
|---|---|---|
| **Nóminas / Impuestos / Operativos** | ✅ Sí, en accrual | Se cuentan correctamente en el resumen (`SUM(totalAmount)` no depende de `invoice_payments`). |
| **Resultado operativo** | ✅ Sí | Se restan del margen bruto cobrado. Correcto. |
| **Ingresos cobrados / Costes directos pagados (base caja)** | ❌ No | Estas 32 filas son gastos, no ingresos ni costes directos. No corresponde. |
| **Pendientes destacados — pagos operativos** | ❌ No aparecen como pendientes | Correcto: no están pendientes, están pagadas. |

**Conclusión**: las 32 filas están correctamente clasificadas para el resumen. La ausencia de `invoice_payments` no genera drift en la contabilidad visible al usuario. Es una **convención del sistema**, no un bug.

### Semántica actual del sistema

- `status='pagada'` en `invoices` = "el usuario declara que ya pagó esta factura desde su cuenta".
- `invoice_payments` = "esta factura fue conciliada con una `bank_transaction` específica en el módulo de conciliación bancaria".

Ambas cosas pueden existir independientemente. Un gasto pagado sin conciliar es válido: la contabilidad accrual lo cuenta, pero no aparece en la vista base caja (`invoice_payments`).

### Recomendación

**No corregir automáticamente.** Tres opciones para el usuario:

1. **Documentar la convención** (recomendado). Añadir nota en `docs/finance-dashboard.md` § "invoice_payments canónico" explicando que gastos de estructura marcados `pagada` sin `invoice_payments` son normales — reflejan pago devengado sin conciliar bancariamente.

2. **Backfill sintético de `invoice_payments`** para las 32 filas. Requeriría crear filas ficticias en `bank_transactions` (que rompe la semántica de "transacción bancaria real"). Riesgo alto para poco beneficio.

3. **Cambiar status a `emitida`** para las que no tengan `invoice_payments`. Cambio semántico grande — el usuario dejaría de ver "pagada" en el detalle de nóminas y las contaría como pendientes de pago operativo, que es incorrecto (ya se pagaron desde el banco, solo no se conciliaron).

**Sugerencia**: Opción 1 (documentar). PR pequeño solo de docs.

## Nada que corregir automáticamente

Los 9 checks limpios confirman que las correcciones aplicadas durante la semana funcionaron:

- Reclasificación de pagos a talento y fee bancario (bloque de julio 1).
- Recurrentes con subtype asignado.
- Corrección de Alfonso nómina marzo (era 2025-05 mal parseado).
- Trilogía del rediseño del resumen V2.
- TD-14 cerrado.

**Cero acciones destructivas propuestas. Cero PRs correctivos automáticos.**

## Script de auditoría

`scripts/audit-finanzas-consistency.ts` — read-only, 10 checks. Se puede re-ejecutar cuando se quiera:

```bash
npx tsx --env-file=.env.local scripts/audit-finanzas-consistency.ts
```

## Siguiente paso opcional

Si el usuario aprueba la Opción 1 del hallazgo #9, un PR pequeño de docs (`docs/finance-dashboard.md` § "invoice_payments canónico") explicando la convención "pagada sin invoice_payments = pago devengado no conciliado".

Sin acción por ahora — decisión del usuario al despertar.
