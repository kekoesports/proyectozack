Status: done — no-op (no pre-commit, no lint-staged)

## Resultado de auditoría (2026-05-02)

- `.husky/` contiene únicamente `pre-push` con contenido `npm run sync:press`.
- No hay `.husky/pre-commit`.
- `package.json` no tiene configuración `lint-staged`.

Conclusión: ESLint no se ejecuta en hooks de Git en este repo. La activación del parser type-aware no introduce latencia perceptible en el flujo de commits. No se requiere ningún ajuste. El gate type-aware corre solo en CI (`.github/workflows/ci.yml`), exactamente lo que el PRD aprobó.

# 06 — pre-commit hook sin type-aware

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Type-aware linting es lento (User Story 4: si pasa de 60s, considerar excluir). Si husky/lint-staged está configurado y ejecuta la config completa en pre-commit, el hot loop de commits será frustrante. CI corre completo; pre-commit solo necesita comprobaciones rápidas.

Auditar:

1. ¿Existe `.husky/` o configuración `lint-staged` en `package.json`?
2. Si existe y corre ESLint con la nueva config → ajustar para que pre-commit corra lint sin type-aware (e.g. flag o config separada que no active `projectService`).
3. Si no existe → cerrar como no-op documentado.

Una opción de implementación es exponer dos configs (`eslint.config.mjs` para CI con type-aware, y un override sin type-aware invocado por lint-staged). Otra es saltar lint en pre-commit y dejar que CI sea el único gate. Decisión de implementación queda al ejecutor del slice — el PRD no fuerza una.

## Acceptance criteria

- [ ] Auditoría documentada: ¿existe pre-commit? ¿qué corre hoy?
- [ ] Si existe y corre type-aware → ajustado para que el pre-commit no active `projectService`.
- [ ] Si no existe → issue cerrado como no-op con nota explicando.
- [ ] `git commit` local con un cambio trivial completa en tiempo razonable (no >60s).
- [ ] Si se introduce config separada, está documentada brevemente en el PR.

## Blocked by

- Slice 01 (config base type-aware) — el problema solo aparece con `projectService: true` activo.
