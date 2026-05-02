Status: done

# 05 — ADR 0003 React stack decisions

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `docs/adr/0003-react-stack-decisions.md` documentando el research sobre `react-goodways` y la lista de reglas adoptadas vs descartadas. Objetivo: que un futuro contribuidor no proponga adoptar Vite o TanStack Router por enésima vez.

Estructura ADR:

- **Context:** revisión de `react-goodways` como referencia de buenas prácticas React 2025. El proyecto ya está en Next.js 16 App Router; algunas recomendaciones aplican, otras son incompatibles con esa elección.
- **Decision:** adoptar 4 reglas, descartar 3.
  - **Adoptadas:**
    1. `useEffect` solo con justificación (subscripciones reales / APIs imperativas non-React).
    2. State hierarchy URL searchParams > Context > React Query > Zustand. Redux prohibido.
    3. HTTP solo `fetch` o tRPC client. axios prohibido.
    4. Forms con React Hook Form + Zod resolver.
  - **Descartadas (incompatibles con Next.js):**
    1. "No usar Next.js" — rechazado: Server Components, Server Actions, ISR, edge runtime y blob storage son load-bearing.
    2. Vite — rechazado: incompatible con Server Components.
    3. TanStack Router — rechazado: Next App Router cubre el caso de uso.
- **Consequences:** state mgmt ya alineado (no hay Redux); fetch nativo predominante; queda `useState` legacy en algunos formularios complejos que se migran oportunista.

## Acceptance criteria

- [x] Archivo creado en `docs/adr/0003-react-stack-decisions.md`.
- [x] Estructura ADR con Context, Decision (adoptadas + descartadas), Consequences.
- [x] Las 4 adoptadas y las 3 descartadas listadas con justificación breve.
- [x] Estado `Accepted — 2026-05-02`.
- [ ] Las hard rules 11-14 del slice 01 referencian este ADR — pendiente de edición en typescript.md (slice 07 lo cubre).

## Blocked by

- None — can start immediately.
