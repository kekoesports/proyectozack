---
summary: 'Baseline auditable de la IP preexistente de SocialPro antes de crear una futura estructura chipriota.'
read_when:
  - Reusing or transferring SocialPro code
  - Creating KekoPilot repositories or companies
  - Reviewing contributor or ownership evidence
---

# Procedencia de IP — baseline PRE-CYPRUS

**Fecha de corte:** 1 de septiembre de 2026

**Repositorio:** `kekoesports/proyectozack`

**Commit de referencia:** `c80889584d7f8f4ebcacae0eb6d51fd2d2802fbf`

**Clasificación:** `PRE-CYPRUS / PRE-EXISTING IP`

## Alcance y límite

Esta fotografía describe qué existía y cuándo. No concluye quién es el titular
legal o económico del código. El alojamiento en una cuenta de GitHub, la compra
de un dominio o el pago de infraestructura no sustituyen contratos de empleo,
obra por encargo, cesión o licencia.

El primer commit verificable del producto actual es del **17-03-2026**
(`4f905b02`, seguido por la aplicación Next.js raíz en `4830b8a5`). El historial
incluye contribuciones de varios autores. En el repositorio no se localizó una
licencia ni documentación de cesión de derechos de esos contribuyentes.

## Registro inicial de activos

Todos los identificadores siguientes son técnicos y provisionales. No implican
elegibilidad fiscal.

| Código | Activo técnico | Primera evidencia localizada | Alcance principal | Estado al corte |
| --- | --- | --- | --- | --- |
| `SP-PRE-001` | SocialPro Agency CRM | 17-03-2026, `4830b8a5` | Marcas, talentos, campañas, tareas, contratos, administración y RBAC | Operativo |
| `SP-PRE-002` | Deal & Automation Engine | 18-08-2026, `0690f526` para evidencia de deals | Discord, borradores, Sheets, contratos, recordatorios y n8n | Operativo |
| `SP-PRE-003` | Finance Intelligence | 21-06-2026, `796ebb34` para conciliación | Facturas, pagos, conciliación, OCR, P&L y reporting | Operativo con controles humanos |
| `SP-PRE-004` | Zack Agent OS | 21-08-2026, `c835abaf` | Runtime, worker, tools, memoria, aprobaciones, costes y schedules | Implementado; agentes en rollout controlado |
| `SP-PRE-005` | Creator Target Intelligence | 31-08-2026, `95d32fcf` | Discovery, scoring y fuentes multicanal | Implementado, en mejora |
| `SP-PRE-006` | Talent Intelligence | 31-08-2026, `0b35009a` | Snapshots, rankings y tendencias por creador | Implementado |
| `SP-PRE-007` | Growth, SEO & Editorial Intelligence | 02-05-2026, `8d2e3e5a`; 14-05-2026, `90d740dd`; 24-08-2026, `be89ea9b` | Prensa, contenido, SEO de talentos y Search Console | Parcial/operativo según módulo |
| `SP-PRE-008` | Giveaways & Loyalty Platform | Historia anterior al corte | Sorteos, puntos, misiones, premios y auditoría | Operativo |

## Componentes ya reutilizables conceptualmente

- Next.js 16, React 19, TypeScript strict y Drizzle/PostgreSQL.
- Salida Docker `standalone`, health checks y despliegue VPS.
- Better Auth, RBAC y separación servidor/cliente.
- `agent_runs`, steps, tool calls, aprobaciones, schedules, memoria, worker y
  ledger de uso.
- `agent_usage_ledger`: proveedor, modelo, tokens, coste estimado, duración y
  timestamps por ejecución.
- Auditoría de eventos, idempotencia, redacción y centros de aprobación.
- Automatizaciones n8n y APIs internas autenticadas.

Reutilizable conceptualmente no significa transferible sin análisis. Copiar
código, adaptar patrones y licenciar un módulo son hechos diferentes y deben
quedar separados.

## Hechos de titularidad que faltan

Antes de transferir, licenciar o aportar cualquier activo a una Cyprus Ltd se
necesita un expediente que responda, por contribuyente y módulo:

1. ¿Quién escribió el código y bajo qué relación jurídica?
2. ¿Existía contrato de trabajo/servicios con cesión suficiente de derechos?
3. ¿Quién pagó cada factura, salario, API e infraestructura?
4. ¿Qué entidad asumió el riesgo y dirigió el desarrollo?
5. ¿Hay componentes de terceros y bajo qué licencia?
6. ¿Qué datos, marcas, contratos o secretos no pueden trasladarse con el código?
7. ¿Qué valor y tratamiento fiscal tendría una licencia o transferencia entre
   España, Estados Unidos y Chipre?

## Entidades y marcas: no confundir

- `socialpro.es` y el CRM operativo pertenecen a una historia empresarial que
  debe documentarse con ELEVATEX AGENCY PA SL y las personas/contratistas que
  hayan intervenido.
- `kekopilot.com` está registrado bajo la cuenta Cloudflare de PLAYMAKER MEDIA
  LLC. El registro del dominio no transfiere el código del CRM a la LLC.
- La futura Cyprus Ltd todavía no existe. Ningún activo de este baseline puede
  describirse como “desarrollado por Cyprus Ltd”.

## Registro de cambios posterior al baseline

Cada nueva mejora debe registrar en su PR:

- activo afectado;
- procedencia (`PRE-EXISTING`, `NEW`, `ACQUIRED`, `RELATED-PARTY` o
  `UNRELATED-THIRD-PARTY`);
- si es mantenimiento rutinario o candidato a I+D;
- problema e incertidumbre técnica, cuando proceda;
- evidencia y resultado;
- referencia separada de tiempo y coste real.

La plantilla de PR del repositorio implementa estos campos. No se estiman horas
desde commits y no se convierte el ahorro operativo en gasto contable.
