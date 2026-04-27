# lib/schemas — Zod schemas (cross-cutting)

> Schemas Zod compartidos entre route handlers (`app/api/*`) y componentes
> client (forms con react-hook-form).

## Reglas

- **Siempre `safeParse`, nunca `parse`** — devuelve `{ success, error|data }`.
- **Mensajes localizados** en español (UI hispana).
- **`.max(N)`** en strings libres para evitar payloads abusivos.
- **Sin lógica de negocio** — solo validación estructural y de formato.

## Convenciones

- Inferir el tipo TS desde el schema: `type X = z.infer<typeof xSchema>;`.
- Los schemas exportan dos cosas: el `Schema` y el `type` inferido.
- Si un schema crece >100 LOC, plantear feature-local (`features/<f>/schemas/`).

## TSDoc

```ts
/**
 * Body del formulario de contacto.
 * Validado en `app/api/contact/route.ts` y en
 * `features/contact/components/ContactSection.tsx`.
 */
export const contactSchema = z.object({ ... });
```
