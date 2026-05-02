Status: needs-triage

# 03 — globalIgnores para `scripts/`

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

`scripts/` ya está excluido del `tsconfig.json` (`"exclude": ["node_modules", "scripts"]`), por lo que el parser type-aware no tendrá información de tipos para esos archivos. Sin ignorarlos en ESLint, `projectService: true` lanzará errores tipo "file not found in any tsconfig" al lintar.

Auditar si `eslint-config-next` ya cubre `scripts/` por defecto. Si lo hace, cerrar como no-op documentado en el comentario del PR. Si no, añadir `"scripts/**"` al `globalIgnores` existente en `eslint.config.mjs`.

## Acceptance criteria

- [ ] Confirmar (vía `npx eslint --print-config scripts/seed.ts` o lectura de `eslint-config-next`) si `scripts/**` ya está ignorado por defecto.
- [ ] Si no lo está → añadir `"scripts/**"` al array de `globalIgnores` en `eslint.config.mjs`.
- [ ] Si ya lo está → cerrar como no-op, dejando comentario en el PR/issue documentando el resultado de la auditoría.
- [ ] `npm run lint` no produce errores referentes a archivos en `scripts/`.

## Blocked by

- Slice 01 (config base type-aware) — sin `projectService: true` activo, este problema no aparece.
