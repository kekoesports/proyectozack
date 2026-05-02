Status: needs-triage

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
