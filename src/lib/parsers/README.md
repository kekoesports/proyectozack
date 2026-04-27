# lib/parsers — Heurísticas de parsing

> Parsers que extraen datos estructurados de formatos arbitrarios
> (PDF, HTML, CSV mal formado). Heurísticos, NO contratos formales.

## Archivos

| Archivo | Propósito |
|---|---|
| `pdfHeuristics.ts` | extracción de campos de facturas PDF (admin/invoices). |

## Reglas

- **Idempotente** — la misma entrada produce la misma salida.
- **Devolver `null`/`undefined`** cuando no hay match. No lanzar.
- **Tests con fixtures reales** — `__tests__/server/<parser>.test.ts`.
- **Documentar el patrón heurístico** en TSDoc para que un humano (o LLM)
  pueda entender por qué el regex está como está.
