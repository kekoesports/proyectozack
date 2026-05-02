Status: needs-triage

# 02 — Saneamiento `auth/equipo` (Server Actions de creación de usuarios y roles)

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Aplicar los deep modules del issue 01 a los Server Actions del módulo `auth/equipo` — primero en orden de gravedad porque son los que crean usuarios admin y cambian roles. Si un atacante explota un boundary aquí, escala a control total del CRM.

Alcance:

- `src/app/admin/(dashboard)/equipo/` — Server Actions de alta de usuarios, edición, cambio de rol.
- `src/app/admin/(dashboard)/equipo/fotos/` — upload de fotos de equipo (aplica `validateUploadedFile`).

Patrón canónico (PRD § "Server Action canonical pattern"):

```
1. requireRole/requireAnyRole (o assertCanDelete si delete)
2. parseFormData(formData, MySchema) → { ok, data | fieldErrors }
3. Si !ok, return early
4. Llamar query/mutation interna (asume data validada)
5. Retornar { ok: true, data | redirect }
```

Por cada Server Action del dominio:

- Sustituir `formData.get('x') as string` por `parseFormData(formData, Schema)`.
- Sustituir `value as Role` por output del schema con `z.enum([...])`.
- Si hace upload de foto, pasar el `File` por `validateUploadedFile` antes de subir a `@vercel/blob`.
- Sustituir `console.log/error` con datos de usuario por `logRedacted`.
- Migrar oportunistamente a la convención canónica `const X = z.object(...); type X = z.infer<typeof X>;` los schemas tocados.

Schemas en `src/lib/schemas/` — auditar primero, reusar/extender, solo crear nuevo si no existe.

## Acceptance criteria

- [ ] 0 ocurrencias de `as string`/`as Role` en `app/admin/(dashboard)/equipo/**`.
- [ ] Cada Server Action mutante empieza con `requireRole`/`requireAnyRole` y termina con `parseFormData` antes de cualquier acceso a datos.
- [ ] Uploads de foto pasan por `validateUploadedFile` con MIME/ext/magic bytes para PNG y JPEG.
- [ ] Logs no contienen emails ni roles literales sin pasar por `logRedacted`.
- [ ] Sección en el PR description: "Schemas tocados — existentes reusados / extendidos / nuevos creados".
- [ ] Tests existentes del dominio pasan sin modificar (`npm test`).
- [ ] E2E del dominio pasa (`npm run test:e2e -- --grep equipo` o equivalente).
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.
- [ ] Si un Server Action no tenía test y se añade lógica de seguridad nueva (e.g. validación de upload), añadir un test del caso adversarial.

## Blocked by

- Issue 01 (deep modules + tests).
