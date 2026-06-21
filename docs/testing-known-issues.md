# Estado de tests — historial de problemas conocidos

## Auditoría 2026-06-21

### Contexto

Antes de esta auditoría, el suite tenía **37 fallos persistentes** en `src/__tests__/server/invoice-schema.test.ts`. La auditoría se realizó para clasificarlos antes de crear PR.

### Clasificación

| Tipo | Cantidad | Descripción |
|---|---|---|
| Fixture desactualizado | 37 | `validCreate` no incluía `scope`, que se añadió como campo requerido en commit `7c12235` (2026-05-31) |
| Bug real | 0 | — |
| Schema desactualizado | 0 | — |
| Causado por nueva feature | 0 | — |

**Causa raíz única:** en commit `7c12235` (feat: scope campaign/company + beneficio neto P&L) se añadió `scope: z.enum(INVOICE_SCOPES)` como campo requerido sin default en `invoiceFields`. El fixture `validCreate` en el test no fue actualizado en ese commit.

### Corrección aplicada

- Añadido `scope: 'company'` al fixture `validCreate` en `invoice-schema.test.ts`.
- Añadido test faltante: "rejects missing required field 'scope'".
- **Sin cambios en el schema ni en las queries de negocio.**

### Estado tras corrección

| Suite | Tests | Estado |
|---|---|---|
| `invoice-schema.test.ts` | 89 | ✅ todos pasan |
| `bank-reconciliation.test.ts` | 35 | ✅ |
| `ai-assistant.test.ts` | 44 | ✅ |
| `invoice-payments.test.ts` | 24 | ✅ |
| Resto de suites | 851 | ✅ |
| **Total** | **1043** | **✅ 0 fallos** |

### Verificación

```
npm test → Tests: 1043 passed, 0 failed
npx tsc --noEmit → sin errores
npm run lint → sin errores
```

---

## Referencia futura

Si los tests vuelven a fallar masivamente en un suite (>5 a la vez con el mismo error), el patrón suele ser:
1. Un campo requerido añadido al schema sin actualizar el fixture del test.
2. Un enum value eliminado sin actualizar los tests que lo usan.
3. Un import roto tras refactor.

En todos los casos: buscar la causa raíz compartida antes de arreglar tests individualmente.
