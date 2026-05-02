Status: needs-triage

# PRD 3 — ESLint Strict Activation

## Problem Statement

Aunque el `tsconfig.json` ya está al máximo nivel de estrictez (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`), la config de ESLint actual (`eslint-config-next/typescript` solo) **no impide** que un agente futuro vuelva a introducir:

- `formData.get('x') as string` (el patrón que PRD 2 elimina).
- `process.env.X as MyType`.
- `: any` en algún rincón.
- `as Foo` post-`unknown` sin validar realmente.

Sin enforcement automático en CI, las reglas documentadas en `.claude/rules/typescript.md` (PRD 1) dependen 100% de que el agente y el reviewer humano se acuerden. Las reglas que no fallan el build se erosionan en meses.

PRD 2 saneará el código existente. Este PRD **bloquea regresiones** activando type-aware ESLint en CI.

## Solution

Modificar `eslint.config.mjs` para activar la familia `no-unsafe-*` con type-aware linting, prohibir explícitamente `any`/`@ts-ignore`/`non-null-assertion`/object-literal-type-assertions, y añadir overrides amplios para tests (donde casts de mocks son inevitables).

Configuración aprobada en grilling Q7. Ejes confirmados:

- **Type-aware linting:** sí (`projectService: true`). Lento, solo en CI / lint manual, no en pre-commit.
- **Cómo prohibir `as`:** vía `no-unsafe-*` (semántico), no sintáctico — evita falsos positivos en `as const` y narrowing legítimo.
- **Overrides para tests:** `__tests__/**`, `*.test.{ts,tsx}`, `*.fuzz.{ts,tsx}` con `no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion` apagados.
- **Paquetes nuevos:** ninguno. `@typescript-eslint/*@8.57.1` ya viene transitivo via `eslint-config-next/typescript`. Versión confirmada como compatible con `projectService: true` (introducido en v8).

## User Stories

1. Como humano que aprueba un PR, quiero que CI falle automáticamente si el agente reintroduce `formData.get('x') as string` o `: any`, para no depender de que yo lo cace en review.
2. Como agente Claude que abre un PR, quiero ver el error de ESLint en mi terminal con mensaje accionable (línea + regla violada), para corregir antes de empujar.
3. Como agente Claude trabajando en un test, quiero poder usar `as jest.Mock` y `: any` sin que ESLint me bloquee, porque los mocks de tests son escape hatch legítimo.
4. Como humano que ejecuta `npm run lint` localmente, quiero que tarde lo razonable (type-aware es lento), pero no demasiado — si pasa de 60s, considerar excluir `lint-staged` y solo correr en CI completo.
5. Como agente Claude que necesita un cast genuinamente legítimo (e.g. tras `if (typeof x === 'string')` que TS no infiere), quiero que ESLint no lo bloquee si va con comment `// safe: comprobado typeof above`.
6. Como humano auditando deuda técnica, quiero que el día que se active esta config, el repo entero pase verde sin allowlist temporal — eso solo es posible si PRD 2 está completo.
7. Como reviewer, quiero que el PR de activación sea pequeño y revisable (solo `eslint.config.mjs`, no fixes masivos en el mismo PR), para confirmar que el CI verde es real, no consecuencia de allowlist.

## Implementation Decisions

### Reglas a activar (severity `error`)

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/consistent-type-assertions` con `assertionStyle: 'as'` y `objectLiteralTypeAssertions: 'never'`
- `@typescript-eslint/no-misused-promises` (bonus — captura `async` Server Actions usadas como event handlers donde no se hace `await`)
- `@typescript-eslint/await-thenable`

### Configuración type-aware

- `parserOptions.projectService: true` (modo moderno, no requiere listar tsconfigs explícitos).
- `tsconfigRootDir: import.meta.dirname` para resolución de paths.

### Overrides

Files que ignoran las reglas estrictas:

- `**/__tests__/**/*.{ts,tsx}`
- `**/*.test.{ts,tsx}`
- `**/*.fuzz.{ts,tsx}`

En estos: `no-explicit-any`, `no-unsafe-*` (toda la familia), `no-non-null-assertion` → `off`.

`scripts/` ya está excluido del tsconfig actual (`"exclude": ["node_modules", "scripts"]`); se añade al `globalIgnores` de ESLint si no está cubierto por `eslint-config-next` defaults.

### CI integration

Verificar que `npm run lint` se ejecuta en CI y falla el job en error. Si no existe step de lint en el workflow, añadirlo (no debería ser necesario — Next ya lo recomienda).

`lint-staged` (si existe pre-commit hook) no debe correr la config completa type-aware (lento). Si husky/lint-staged está configurado, ajustar para correr solo `eslint --no-eslintrc` o equivalente sin type-aware en pre-commit. CI corre completa.

### Verificación de gate

Antes de mergear este PRD: `npm run lint` debe pasar verde con la config nueva, sin allowlist, sin disable comments masivos. Si falla, no se mergea — significa que PRD 2 no completó saneamiento de algún archivo. Crear issue de remanente y completar antes.

### Disable comments individuales

Si tras PRD 2 quedan 1-2 casos legítimos donde la regla no aplica (e.g. interop con librería untyped), permitir `// eslint-disable-next-line @typescript-eslint/<rule> -- <razón>` con comment obligatorio explicando. Sin comment, ESLint falla. La regla `@typescript-eslint/ban-ts-comment` ya viene en `recommended` y aplica también a `eslint-disable` con su severidad por defecto.

## Testing Decisions

Este PRD es solo configuración. No hay código aplicativo nuevo a testear.

Verificación que aplica:

- Ejecutar `npm run lint` localmente sobre el repo completo tras aplicar la config nueva. Debe pasar verde.
- Ejecutar `npm test` y `npm run test:e2e` para confirmar que las reglas en tests están correctamente apagadas via overrides (no romper tests existentes).
- Ejecutar `npx tsc --noEmit` para confirmar que no hay regresión de tipos (la config de ESLint no debe cambiar inferencia, pero verificación cuesta poco).
- Probar manualmente que un cambio sintético violando la regla (ej. añadir `let x: any = 1` temporalmente) hace fallar `npm run lint`. Eliminar el cambio antes de commit.

Si CI tiene step explícito de lint, verificar en el primer PR sintético tras este merge que el job falla cuando se viola una regla.

## Out of Scope

- Saneamiento de código (es PRD 2). Si ESLint reporta errores al activarse, es señal de que PRD 2 quedó incompleto.
- Cambios a `tsconfig.json` (ya estricto al máximo).
- Adopción de prettier/biome/otro linter.
- Custom rules ESLint propias del proyecto (e.g. ban Drizzle raw SQL con templates). Reconocido como mejora futura; complejidad de escribir custom rules no justifica el alcance ahora.
- Reglas de import ordering (`simple-import-sort`, etc.) — concierne estilo, no type safety/security.
- Activación de type-aware en pre-commit hooks (lento, frustrante en hot loop). Solo CI.
- Configurar gh actions / workflows si no existen.

## Further Notes

- Bloqueado por PRD 2 (sin saneamiento, este PRD activa errores masivos y no se puede mergear).
- Estimación: 1-2 horas. La config es ~30 líneas, la mayoría del tiempo es verificar verde y ajustar overrides si algún test no esperado salta.
- Una vez mergeado, las reglas son auto-enforced y la skill `typescript-strict` (PRD 1) pasa de "guidance" a "redundante con CI" para esas reglas concretas. Sigue siendo útil para los patrones no expresables en ESLint (OWASP checklist, naming Zod, branded types, file uploads).
- Si en algún momento el coste de type-aware lint se vuelve insostenible (>3min en CI), evaluar reducir scope (solo `src/`, excluir `app/api/` rara vez tocado, etc.). No optimizar prematuramente.
- ADR 0002 documenta el porqué del approach C1 (sanear primero, ESLint después). Este PRD ejecuta el segundo paso de ese ADR.
