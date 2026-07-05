# Allowlist de copy sensible

> Términos que el test `src/__tests__/server/sensitive-copy-allowlist.test.ts` marca como prohibidos por defecto en UI dirigida a usuarios ES. Cualquier ocurrencia fuera de esta allowlist hace fallar el test.

Última actualización: 2026-07-05

## Términos vetados por defecto

Case-insensitive:

- `wagering`
- `wager`
- `deposit` / `depositar` / `depósito`
- `bonus` (excepto en contextos comerciales de agencia/PR, ver excepciones)
- `apuesta` / `apostar`
- `multiplica` / `multiplicador`
- `jackpot`
- `gamble` / `gambling`
- `case battle` / `case_battle`
- `upgrader`
- `cara o cruz` / `coin flip`

## Excepciones documentadas

### Copy que se puede mantener con contexto no promocional

- **`docs/**`, `roadmap*`, `.scratch/**`, `README*`** — documentación interna y planificación. El test no debe escanear estos paths.
- **`__tests__/**`** — tests que verifican precisamente el gating.
- **`src/app/apuesta-segura-cs2/**`** — landing informativa sobre pronósticos deportivos con Blogabet. Contiene "apuesta" en el nombre. Se excluye del análisis porque el sitio ya avisa +18 y el copy es informativo, no promocional de operador sin licencia. Revisar por separado.
- **`src/app/servicios/igaming/**`**, `src/app/betting-influencers/**`**, `src/app/influencers-betting/**`**, `src/app/guia-dgoj-igaming-influencers/**`** — landings B2B para clientes iGaming operadores; el copy va dirigido a marcas licenciadas, no a jugadores finales. Se excluyen del análisis.

### Componentes de partner externo con copy neutralizado

Los `BrandCard*` en `src/features/giveaway-platform/components/` renderizan versión "restricted" cuando el país es ES sin flag activo. La versión "full" (mantenida por compatibilidad con países donde el partner sí tiene licencia) sí contiene copy sensible. Por eso el test **debe distinguir** entre:

- Copy sensible dentro de un bloque marcado con `// @allow-sensitive-copy: <razón>` — permitido.
- Copy sensible fuera de ese bloque — falla el test.

## Cómo añadir una excepción nueva

1. Justificar la excepción en un PR con enlace al riesgo asociado.
2. Añadir la ruta / patrón al archivo de configuración del test (`src/__tests__/server/sensitive-copy-allowlist.test.ts` — sección `EXCLUDED_PATHS`).
3. Documentar la excepción en este archivo con fecha y responsable.

## Auditar antes de retirar una excepción

Cuando el equipo legal firme la revisión (`docs/legal/todos-abogado.md`), revisar si las excepciones actuales siguen siendo necesarias. Preferencia: reducir la allowlist.
