# ADR 0003 — Decisiones de stack React

**Estado:** Accepted — 2026-05-02

## Context

Durante la definición de PRD 1 se revisaron las recomendaciones de `react-goodways` como referencia de buenas prácticas React 2025. El proyecto corre en Next.js 16 App Router con Server Components y Server Actions como primitivas load-bearing. Algunas recomendaciones de `react-goodways` aplican directamente; otras son incompatibles con esa elección de framework.

El objetivo de este ADR es evitar que un futuro contribuidor proponga adoptar Vite, TanStack Router o Redux "porque lo recomienda la guía", sin entender por qué ya fueron evaluados y descartados.

## Decision

### Reglas adoptadas

Las siguientes cuatro reglas de `react-goodways` son compatibles con Next.js App Router y se aplican en este proyecto:

1. **`useEffect` solo con justificación.** Permitido únicamente para subscripciones reales (window/document events, third-party SDKs) e integraciones con APIs imperativas non-React. Estado derivado, event handlers y data fetching van por React Query o Server Components.

2. **Jerarquía de estado.** URL searchParams > Context > React Query > Zustand. Redux prohibido. Cualquier `useState` que represente estado compartido cross-component requiere comment justificando por qué no sube en la jerarquía.

3. **HTTP: solo `fetch` nativo o tRPC client.** axios y otras librerías HTTP están prohibidas. `fetch` es nativo en el runtime de Next y evita añadir dependencias sin beneficio.

4. **Formularios: React Hook Form + Zod resolver.** No estado de formulario manual con `useState` para más de 2-3 campos. El proyecto ya usa `@hookform/resolvers` en todos los formularios del panel admin.

### Opciones descartadas (incompatibles con Next.js App Router)

1. **"No usar Next.js"** — rechazado. Server Components, Server Actions, ISR, edge runtime y Vercel Blob storage son load-bearing en este proyecto. Migrar a un setup custom implicaría reimplementar todo eso sin ganancia.

2. **Vite** — rechazado. Vite no soporta Server Components ni Server Actions. Adoptarlo requeriría abandonar las primitivas sobre las que está construido el CRM.

3. **TanStack Router** — rechazado. Next.js App Router cubre el caso de uso de routing tipado con layouts anidados. Añadir TanStack Router sobre Next crearía conflicto de responsabilidades; adoptarlo en su lugar requeriría salir de Next (ver punto anterior).

## Consequences

- El estado global ya está alineado: no hay Redux en el proyecto.
- `fetch` nativo predomina en los route handlers y Server Actions existentes.
- Quedan algunos `useState` legacy en formularios complejos que serán migrados a RHF oportunistamente en PRD 2 cuando se toque cada módulo.
- Vite, TanStack Router y la ausencia de Next.js quedan documentados como "evaluados y rechazados" — no requieren rediscusión en futuras sesiones o PRs.
