---
name: typescript-strict
description: Patrones detallados de TypeScript estricto para este proyecto. Usar cuando se editen archivos .ts/.tsx, se creen o modifiquen Zod schemas, se escriban Server Actions o route handlers, o se revise código por type safety o seguridad.
---

# typescript-strict

Expansión de las hard rules en `.Codex/rules/typescript.md`. Contiene patrones con código real del proyecto, OWASP checklist y excepciones documentadas.

## Boundary patterns

### FormData (Server Actions)

Patrón canónico del proyecto (`src/app/admin/(dashboard)/campanas/actions.ts`):

```typescript
export async function createCampaignAction(formData: FormData) {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const raw = Object.fromEntries(formData);
  const parsed = createCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  // usar parsed.data — tipado y seguro
}
```

Retornar siempre `{ ok: boolean, fieldErrors?: Record<string, string[]> }` o `{ success, error }` — nunca throw en Server Actions.

### Campos array en FormData

```typescript
const tags = formData.getAll('tags') as string[]; // safe: File no puede estar aquí
const raw = { ...Object.fromEntries(formData), tags };
const parsed = Schema.safeParse(raw);
```

### URL searchParams

```typescript
const SearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().max(200).optional(),
});

const parsed = SearchSchema.safeParse(Object.fromEntries(searchParams));
```

### File uploads

```typescript
const FileSchema = z.object({
  type: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  size: z.number().max(10 * 1024 * 1024), // 10 MB
});

const file = formData.get('file');
if (!(file instanceof File)) return { success: false, error: 'No file' };
const parsed = FileSchema.safeParse({ type: file.type, size: file.size });
```

## OWASP checklist — código sensible (facturas, contratos, file uploads)

Revisar antes de aprobar cualquier cambio en estas áreas:

- **Path traversal** — nunca concatenar input de usuario en rutas de filesystem/blob. Usar `path.basename()` o generar UUID para nombres de archivo.
- **File upload** — validar MIME type desde el servidor (no `file.type` del cliente solo), validar tamaño, rechazar extensiones ejecutables.
- **Open redirects** — validar que URLs de redirección sean relativas (`/...`) o pertenezcan al dominio propio antes de `redirect()`.
- **Timing attacks** — comparar tokens/hashes con `timingSafeEqual` (crypto module), no `===`.
- **Secrets en logs** — ver sección "PII prohibida en logs" abajo. Nunca `console.error(error)` con un error que pueda contener tokens o datos de pago.
- **Prototype pollution** — no usar `Object.assign({}, userInput)` ni spread de input externo no parseado. Zod parse crea objetos limpios.

Ver también → [`docs/adr/0001-zod-safeparse-at-boundaries.md`](../../../docs/adr/0001-zod-safeparse-at-boundaries.md)

## Cuándo `as` es legítimo

Permitido solo en estos tres casos — siempre con comment:

```typescript
// 1. as const — inferir literal types
const ROLES = ['admin', 'manager', 'staff'] as const;

// 2. as unknown — romper una cadena de tipos sin perder seguridad
const x = value as unknown as SpecificType; // safe: convertido tras validación manual

// 3. Narrowing tras typeof/instanceof/Zod parse
if (typeof value === 'string') {
  const s = value; // ya es string, no necesita as
}
// Zod parse result
if (parsed.success) {
  const data = parsed.data; // safe: Zod garantiza el tipo
}
```

Prohibido: `formData.get('x') as string`, `res.json() as MyType`, `event.target as HTMLInputElement` sin narrowing.

## Naming Zod

Patrón canónico (Zod docs). Para schemas nuevos usar este patrón:

```typescript
const CampaignForm = z.object({
  name: z.string().min(1).max(200),
  brandId: z.coerce.number().int().positive(),
});
type CampaignForm = z.infer<typeof CampaignForm>;
```

El proyecto existente mezcla `taskSchema` (lowercase) + `TaskFormInput` (PascalCase separado). Migración oportunista — no tocar un schema existente si el cambio no pertenece al PR en curso.

Ver también → [`docs/adr/0001-zod-safeparse-at-boundaries.md`](../../../docs/adr/0001-zod-safeparse-at-boundaries.md)

## Branded types para IDs

Recomendación para entidades nuevas — no obligación retroactiva:

```typescript
type BrandId = number & { readonly __brand: 'BrandId' };
type TalentId = number & { readonly __brand: 'TalentId' };

function asBrandId(n: number): BrandId { return n as BrandId; } // safe: constructor explícito
```

Entidades existentes (`Campaign`, `Invoice`, etc.) usan `number` plano — no migrar salvo que el PR lo justifique.

## Excepción InferSelectModel (Drizzle)

Los resultados de queries Drizzle son data interna confiable. No requieren Zod parse.

```typescript
// src/types/campaign.ts
import type { InferSelectModel } from 'drizzle-orm';
import type { campaigns } from '@/db/schema';

export type Campaign = InferSelectModel<typeof campaigns>;
```

Usar `InferSelectModel` para tipos de output de queries. Solo aplicar Zod parse cuando el dato cruza un boundary externo (FormData, API response externa, webhook, localStorage).

## PII prohibida en logs

Nunca loggear estos datos, ni siquiera en `console.error` de desarrollo:

- Emails, teléfonos, nombres de usuario
- Tokens de sesión, API keys, BETTER_AUTH_SECRET, RESEND_API_KEY
- IDs internos sensibles que permitan enumerar recursos de otro usuario
- Datos de pago: importes de facturas con campaignId+brandId, métodos de pago, cuentas bancarias
- Valores de `process.env.*` (cualquiera)

Redactar antes de loggear:

```typescript
// mal
console.error('Invoice error', { invoiceId, userId, amount, token });

// bien
console.error('Invoice error', { invoiceId }); // solo el ID necesario para debug
```

La utilidad `lib/log.ts` con redacción automática está planificada para PRD 2 — hasta entonces, redactar inline.

Ver también → [`docs/adr/0002-saneamiento-then-eslint-strict.md`](../../../docs/adr/0002-saneamiento-then-eslint-strict.md) · [`docs/adr/0003-react-stack-decisions.md`](../../../docs/adr/0003-react-stack-decisions.md) · [`docs/adr/0004-csrf-trust-next-defaults.md`](../../../docs/adr/0004-csrf-trust-next-defaults.md)
