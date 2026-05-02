# ADR 0002 — Sanear código antes de activar ESLint estricto

**Estado:** Accepted — 2026-05-02

## Context

`tsconfig.json` ya corre en modo estricto máximo (`strict: true`, `noUncheckedIndexedAccess`, etc.). Sin embargo `eslint-config-next/typescript` en su configuración actual no impide patrones como `as string`, `: any` explícito o `@ts-ignore` sin justificación. Las 15 hard rules del proyecto (PRD 1) documentan los patrones prohibidos, pero sin un gate automático en CI esas reglas se erosionan en semanas.

El plan de implementación es en tres PRDs:

- PRD 1 (este) — documentar reglas y decisiones.
- PRD 2 — sanear el código existente para que cumpla las reglas.
- PRD 3 — activar ESLint estricto en CI con gate verde sin allowlist.

## Decision

**C1 — Sanear primero, activar ESLint después.**

PRD 2 corrige todos los usos de `as Type` ilegítimos, `: any`, `@ts-ignore` sin justificación y demás violaciones en el código existente. Solo después PRD 3 activa las reglas ESLint correspondientes. El PR de activación (PRD 3) será pequeño y revisable; el gate queda verde sin ningún `disable` comment.

## Alternatives considered

### C2) Activar ESLint estricto ahora + allowlist progresivo en `eslint.config.mjs`

Añadir los archivos/directorios problemáticos al allowlist y sanearlos "con el tiempo".

Rechazado: la experiencia en proyectos similares muestra que los archivos en allowlist nunca se sanean — la deuda se vuelve indefinida y el gate solo cubre código nuevo, no el existente.

### C3) Activar ahora + bulk de `// eslint-disable-next-line` por archivo

Añadir disable comments en masa para que el build pase, y eliminarlos a medida que se sanea.

Rechazado: contamina el blame, oculta los problemas reales y hace que la revisión del PR de saneamiento sea más difícil de auditar.

### C4) Mantener la config actual y confiar en las hard rules en markdown

No activar ESLint estricto nunca y depender solo de code review + reglas documentadas.

Rechazado: sin gate automático, las reglas se erosionan en meses. Los LLMs que generan código también omiten las reglas si no hay linter que las fuerce.

## Consequences

- PRD 2 requiere 1-2 días concentrados de saneamiento antes de que PRD 3 pueda mergearse.
- A cambio, el repo queda verde sin deuda oculta desde el primer día del gate.
- Cualquier regresión futura (nuevo `as string` ilegítimo) la detecta CI en el mismo PR que la introduce.
- PRD 3 está bloqueado por PRD 2. Este ordering es intencional y está documentado aquí.
