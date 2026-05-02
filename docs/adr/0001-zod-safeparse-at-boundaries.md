# ADR 0001 — Zod safeParse en bordes externos

**Estado:** Accepted — 2026-05-02

## Context

El proyecto tiene `src/lib/schemas/` con schemas Zod para todos los formularios del panel admin. Los Server Actions reciben `FormData` y deben devolver errores estructurados por campo para que el cliente los renderice junto al input correspondiente sin recargar la página.

Necesitábamos un patrón uniforme para: FormData, URL searchParams, JSON body, cookies, headers, file uploads, webhook payloads y localStorage.

## Decision

Patrón **D+B**: `Schema.safeParse(...)` con retorno explícito `{ ok: true, data } | { ok: false, fieldErrors }`.

```typescript
const parsed = CreateCampaignSchema.safeParse(Object.fromEntries(formData));
if (!parsed.success) {
  return {
    ok: false,
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
// usar parsed.data — tipado, sin cast
```

Cada Server Action que muta datos sigue este shape. El cliente recibe `fieldErrors` como `Record<string, string[]>` y puede mostrarlo por campo con React Hook Form.

**Excepción explícita:** resultados de queries Drizzle internas son datos confiables. `InferSelectModel` sustituye a Zod parse en esos casos.

## Alternatives considered

### A) `Schema.parse(...)` + throw + try/catch en Server Action

```typescript
try {
  const data = Schema.parse(Object.fromEntries(formData));
} catch (e) {
  return { ok: false, error: e.message }; // un solo string, sin fieldErrors
}
```

Rechazado: la UX de formulario necesita errores por campo, no un string plano. Con `parse` + throw no hay `fieldErrors` estructurados sin añadir lógica extra que duplica lo que `safeParse` da gratis.

### C) Helper opaco que oculta el shape

```typescript
const result = parseOrFail(Schema, formData); // helper interno
```

Rechazado: oculta el shape de retorno, dificulta debug y añade fricción cuando el shape evoluciona. Cada Action tiene shape ligeramente distinto según contexto; forzar un helper común genera más casos especiales que los que resuelve.

## Consequences

- **Verbosity moderada** — cada Server Action repite el shape `{ ok, fieldErrors }`. Aceptable: el patrón es corto y legible.
- **UX de formulario consistente** — todos los formularios admin reciben `fieldErrors` con la misma forma y React Hook Form los renderiza por campo.
- **Debug directo** — `parsed.error.flatten()` expone todos los errores de validación sin intermediarios.
- **Sin excepciones silenciosas** — `safeParse` nunca lanza; el flujo de error es siempre explícito.
