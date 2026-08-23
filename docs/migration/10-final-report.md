# Informe final

> **Plantilla.** Se rellena al terminar la Fase 9, con datos medidos.

## Resumen

_Qué se migró, cuándo, y con cuánto corte de servicio._

## Cronología

| Fase | Fecha | Notas |
|---|---|---|
| 0 — Auditoría | 2026-08-21 | Línea base 2 vCPU / 3,83 GiB. Upgrade contractual a VPS 2000 G12 confirmado el 21-08; medición del sistema pendiente |
| 1 — Código portable | 2026-08-21 | PR #303 |
| 2 — Infraestructura | 2026-08-21 | PR #306 |
| 3 — Staging | | |
| 4 — Ficheros | | |
| 5 — Backups | | |
| 6 — Preparación | | |
| 7 — Cutover | | |
| 8 — Observación | | |
| 9 — Retirada | | |

## Medido, no estimado

| Métrica | Vercel + Neon | VPS |
|---|---|---|
| Errores 5xx / día | | |
| Latencia p50 / p95 | | |
| Tiempo de build | | |
| Tiempo de despliegue | | |
| RPO | n/d | |
| RTO | n/d | |
| Coste mensual | | |

## Lo que salió mal

_Sin adornos: es lo que hará útil este documento dentro de un año._

## Lo que se aprendió

_Decisiones que se tomarían igual y las que no._

## Deuda que queda

- Geo por país sin equivalente propio
- `@neondatabase/serverless` en ~101 scripts
- Un solo servidor: sin redundancia
