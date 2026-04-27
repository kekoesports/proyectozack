# types/ — TypeScript type definitions

> Tipos del modelo de dominio. Re-exportados desde `index.ts`.

## Source of truth

Los tipos base se infieren del schema Drizzle:

```ts
import { type InferSelectModel } from 'drizzle-orm';
import { talents } from '@/db/schema';

export type Talent = InferSelectModel<typeof talents>;
```

Los tipos compuestos (`*WithRelations`) viven en este folder.

## Archivos

| Archivo | Tipos clave |
|---|---|
| `talent.ts` | `Talent`, `TalentWithRelations`, `TalentSocial`, `TalentStat` |
| `talentBusiness.ts` | `TalentBusiness` |
| `case.ts` | `CaseStudy`, `CaseStudyWithRelations` |
| `content.ts` | `Brand`, `Collaborator`, `TeamMember`, `BlogPost` |
| `brand.ts` | `BrandUser`, `BrandSession` |
| `crmBrand.ts` | `CrmBrand`, `CrmBrandContact`, `CrmBrandFollowup` |
| `crmTask.ts` | `CrmTask` |
| `crmTaskTemplate.ts` | `CrmTaskTemplate` |
| `invoice.ts` | `Invoice`, `InvoiceWithRelations` |
| `invoiceImport.ts` | tipos del flujo de import |
| `target.ts` | `Target`, `TargetPlatform` |
| `analytics.ts` | tipos de growth reports |
| `giveaway.ts` | `Giveaway`, `GiveawayWinner` |
| `index.ts` | re-export central |

## Reglas

- `type` siempre, **nunca `interface`**.
- Reexportar todo desde `index.ts` para que el LLM tenga un único
  punto de entrada (`@/types`).
- Tipos compuestos con TSDoc explicando qué relations incluye.
