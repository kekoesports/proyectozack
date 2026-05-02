Status: done — verified end-to-end in CI (2026-05-02, PR #48)

## Resultado de verificación (2026-05-02)

PR sintético abierto: https://github.com/rechedev9/proyectozack/pull/48 (cerrado sin merge, branch borrado).

**Branch:** `chore/eslint-gate-sanity-check` (commit `d56e7c8`).

**Violaciones plantadas:**

- `src/_gate-check.ts:6:10` → `const x: any = 1` (production file).
- `src/__tests__/server/_gate-check.test.ts:11:9` → mismo patrón dentro de `**/__tests__/**`.

**Resultado en CI (run [25261637904](https://github.com/rechedev9/proyectozack/actions/runs/25261637904)):**

| Job | Status | Tiempo | Comportamiento |
|---|---|---|---|
| `Lint & Type-check` | ❌ FAIL | 1m46s | Reportó `6:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any` en `src/_gate-check.ts`. Exit code 1. |
| `Unit & Fuzz Tests` | ✅ PASS | 2m11s | Tests pasaron sin error en el archivo de test (override del slice 02 funcionando). |
| `Build` | ⏭️ skip | — | Saltado por dependencia en `lint-typecheck` fallido. |

**Conclusión:**

- Gate estricto **funciona end-to-end**. Una violación de `no-explicit-any` (o cualquiera de las 10 reglas activas) en código de producción rompe CI con exit code distinto de cero, bloqueando merge.
- Override de tests (slice 02) **funciona**. La misma violación dentro de `**/__tests__/**` no es flagged.
- Los archivos sintéticos no quedaron en master (PR cerrado sin merge).

PRD 3 cerrado.

# 07 — Verificación sintética del gate

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Validación end-to-end de que el gate funciona como se espera. Un humano abre un PR sintético en una rama desechable con una violación deliberada de las reglas activadas en slice 04 y confirma visualmente que CI rompe el job.

Tipo HITL: requiere humano para abrir/cerrar el PR. No deja código permanente — el resultado es un screenshot/log de CI rompiendo y la confirmación de que las reglas se aplican en el path real (no solo localmente).

Ejemplos de violaciones a probar (al menos una, idealmente dos para cubrir variantes):

- `let x: any = 1` en archivo de `src/` → debe disparar `no-explicit-any`.
- `const fd = new FormData(); const v = fd.get('x') as string;` → debe disparar `no-unsafe-assignment` o similar.
- Misma violación dentro de `*.test.ts` → NO debe disparar (override del slice 02 funcionando).

## Acceptance criteria

- [ ] PR sintético abierto en rama temporal con al menos una violación deliberada en `src/`.
- [ ] CI ejecuta lint y falla el job. Log de CI capturado en comentario del PR/issue.
- [ ] Mismo PR (o segundo) con violación en archivo `*.test.ts` confirma que CI pasa (override funciona).
- [ ] PR sintético cerrado sin merge tras la verificación.
- [ ] Resultado documentado en este issue antes de cerrarlo.

## Blocked by

- Slice 05 (CI lint step) — sin CI corriendo lint, no hay nada que verificar end-to-end.
