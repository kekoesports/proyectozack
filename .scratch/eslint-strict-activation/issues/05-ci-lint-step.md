Status: done — no-op (CI ya corre lint)

## Resultado de auditoría (2026-05-02)

`.github/workflows/ci.yml` job `lint-typecheck` ya ejecuta:

```yaml
- name: Lint
  run: npm run lint
- name: Type-check
  run: npx tsc --noEmit
```

Triggers: `push` y `pull_request` sobre `master`. `npm run lint` retorna exit code distinto de 0 ante cualquier error de ESLint, lo que falla el job. Conclusión: gate ya cubierto, no se modifica el workflow. La verificación end-to-end se realiza en slice 07.

# 05 — CI lint step verificado/añadido

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Sin enforcement automático en CI, las reglas activadas en el slice 04 dependen 100% del agente y el reviewer humano — exactamente la situación que el PRD bloquea. Este slice cierra el gate.

Auditar el workflow de CI del repo (`.github/workflows/*` u otra plataforma):

1. Si existe step que ejecuta `npm run lint` y falla el job en error → confirmar con un commit sintético en local que rompería (sin pushearlo) y cerrar el issue documentando el resultado.
2. Si no existe → añadir step `npm run lint` que rompa el job en error.

Out of scope: configurar GitHub Actions / workflows si no existen (PRD lo declara fuera de scope). Si no hay CI configurado, anotarlo en comentario del PR y crear issue separado.

## Acceptance criteria

- [ ] Auditoría documentada: ¿existe workflow CI? ¿corre lint? ¿rompe en error?
- [ ] Si falta step de lint → añadido al workflow, con `npm run lint` y exit-on-error.
- [ ] El job de CI se ejecuta en el primer PR tras este merge y ejecuta lint visiblemente en los logs.
- [ ] Si no hay CI configurado, issue separado abierto y este cerrado como bloqueado por la creación de CI.

## Blocked by

- Slice 04 (reglas estrictas activadas).
