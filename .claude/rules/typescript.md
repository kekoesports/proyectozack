# TypeScript Hard Rules

15 reglas no-negociables. Sin excepciones salvo las indicadas.

## Tipado (1-3)

1. Prohibido `any`, `@ts-ignore`, `@ts-nocheck`. `@ts-expect-error` solo con comment-pattern `// @ts-expect-error -- <razón breve> — ver .scratch/<feature>/issues/<NN>-<slug>.md` apuntando a una issue local existente.

2. Prohibido `as Type` salvo: `as const`, `as unknown`, narrowing tras `typeof`/`instanceof`/Zod parse con comment `// safe: <razón>`.

3. Tipos derivados de Zod `z.infer<typeof X>`. No mantener `interface X` paralela que duplique el shape.

## Inputs externos / boundary (4-6)

4. SIEMPRE pasan por Zod schema en `src/lib/schemas/` — FormData, URL searchParams, JSON body, cookies, headers, file uploads, webhook payloads, localStorage/sessionStorage. **Excepción:** resultados de queries Drizzle internas son data confiable; tipos derivados via `InferSelectModel` no requieren Zod parse.

5. Pattern FormData: `Schema.safeParse(Object.fromEntries(formData))` retornando `{ ok, fieldErrors }`. Para campos array, usar `formData.getAll(name)` arriba y construir el objeto manualmente antes de `safeParse`.

6. Env vars solo via `lib/env.ts` (`@t3-oss/env-nextjs`). `process.env.X` directo prohibido fuera de ese archivo.

## Auth / data (7-8)

7. `requireRole`/`requireAnyRole` al inicio de toda Server Action y route handler que muta. `assertCanDelete` antes de cualquier delete. Sin condicional bypass.

8. Drizzle ORM only para queries. Raw `sql` template prohibido con input de usuario.

## Output / UI (9-10)

9. `dangerouslySetInnerHTML` prohibido salvo con sanitizer (DOMPurify u equivalente) + comment justificando.

10. Logs y errores: nunca PII (emails, phones, tokens, IDs sensibles), nunca env values, nunca payment data. Redactar antes de loggear.

## React patterns (11-14)

11. `useEffect` requiere comment WHY. Permitido solo para: subscripciones reales (window/document events, third-party SDKs), integraciones con APIs imperativas non-React. Estado derivado, event handlers y data fetching van por React Query/tRPC.

12. State hierarchy: URL searchParams > Context > React Query > Zustand. **Redux prohibido.** Justificar con comment cualquier `useState` que represente estado compartido cross-component.

13. HTTP: solo `fetch` nativo o tRPC client. axios y otras librerías HTTP prohibidas.

14. Forms: React Hook Form + Zod resolver (`@hookform/resolvers`). No estado de formulario manual con `useState` para más de 2-3 campos.

## Verificación (15)

15. Antes de declarar trabajo hecho: `npx tsc --noEmit` && `npm run lint` verde.
