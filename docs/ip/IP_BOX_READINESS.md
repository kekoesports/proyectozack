---
summary: 'Gap analysis y roadmap seguro para preparar KekoPilot y SocialPro ante un posible Cyprus IP Box.'
read_when:
  - Planning a Cyprus company or IP Box claim
  - Creating the KekoPilot product or repository
  - Transferring or licensing software between entities
---

# Cyprus IP Box readiness — SocialPro / KekoPilot

**Fecha de análisis:** 1 de septiembre de 2026

**Estado:** preparación técnica; no se ha constituido Cyprus Ltd ni realizado
transferencia, licencia, valoración o elección fiscal.

## Lectura ejecutiva

El software puede ser un activo cualificado, pero el incentivo recae sobre
beneficio neto atribuible y limitado por Nexus. No existe un botón técnico que
“apruebe el CRM”. El riesgo real está en propiedad, actividad de I+D, costes,
ingresos, sustancia y operaciones entre partes vinculadas.

La vía más defendible es mantener SocialPro como agencia y producto operativo,
tratar todo el baseline actual como IP preexistente y desarrollar el núcleo
nuevo de KekoPilot cuando estén decididos la entidad propietaria, los contratos
y la sustancia. Se utilizará un patrón gradual por APIs, no una reescritura.

## Qué existe y qué falta

| Área | Estado real | Próximo control |
| --- | --- | --- |
| Historial Git y PR | Fuerte desde marzo de 2026; captura prospectiva diaria activa desde 01-09-2026 | Vincular cada evidencia relevante a un parte humano real |
| Agent OS | Runtime, worker, aprobaciones y usage ledger implementados | Separar uso de producto, producción e I+D |
| Auditoría e idempotencia | Ledger IP append-only con hash y snapshots de titular/pagador | Añadir eventos formales de corrección y exportación |
| Docker/VPS | Aplicación portable y staging preparado | No ligar KekoPilot a Vercel/Neon |
| Registro de activos IP | Baseline `SP-PRE-001` activo; titular y pagador pendientes de revisión | Añadir ownership events cuando exista decisión jurídica |
| Proyectos/experimentos I+D | Proyecto y clasificación provisional disponibles; experimentos no | Añadir hipótesis/experimentos tras aprobar el modelo |
| Tiempo y coste por activo | `ip_work_logs` registra tiempo/evidencia; no calcula coste | Conciliar después con nómina y facturas reales |
| Multi-tenancy | No existe `organizationId` en las entidades | Diseñar aislamiento y tests cross-tenant |
| Revenue/IP ledger | No existe | Separar SaaS, licencia, servicios y embedded income |
| Nexus anual | No existe | Cálculo informativo con revisión profesional |
| Ownership chain | No acreditada en el repo | Contratos/cesiones por contribuyente y entidad |
| Cyprus Ltd y sustancia | No existen | Diseño con abogado/asesor antes del core nuevo |
| Tax ruling | No solicitado | Preparar hechos solo cuando el modelo sea real |

Siguen sin existir tablas formales `ip_assets`, `rd_experiments`, `rd_costs`,
`ip_revenue`, `revenue_allocations`, `nexus_snapshots`, `advisor_reviews` ni
columnas `organizationId`/`organization_id`. `ip_projects`,
`ip_evidence_events` e `ip_work_logs` son la capa prospectiva mínima de
evidencia; no sustituyen todavía esos ledgers fiscales o multi-tenant. Los PR
se incorporan como evidencia sin horas ni clasificación, y solo se enlazan a
un parte cuando se registra trabajo real.

## Gates obligatorios

### Gate 0 — baseline y disciplina desde hoy

- [x] Congelar baseline `PRE-CYPRUS`.
- [x] Inventariar activos técnicos iniciales.
- [x] Añadir plantilla de PR con procedencia y evidencia.
- [x] Separar evidencia, coste, ahorro e ingreso por política.
- [x] Implantar expediente prospectivo de proyectos, tiempo y evidencia en el CRM.
- [x] Activar bandeja inmutable y sincronización diaria de PR fusionados.
- [x] Crear data room privado, checklist por fases y registro append-only de versiones documentales.
- [x] Definir la separación de `kekopilot.com`, `app`, `docs`, `status` y `api` sin iniciar el core.
- [ ] Recopilar contratos de empleados/contratistas y cesiones existentes.
- [ ] Identificar quién pagó desarrollo, APIs y hosting por periodo.
- [ ] Crear inventario de dependencias y licencias de terceros.

### Gate 1 — decisión jurídica/fiscal antes de crear el core de KekoPilot

- [ ] Elegir titular económico futuro: Cyprus Ltd, PLAYMAKER MEDIA LLC u otra
  estructura, con motivos comerciales además del ahorro fiscal.
- [ ] Obtener asesoramiento coordinado en Chipre y España sobre residencia,
  sustancia, precios de transferencia, exit tax y DAC6.
- [ ] Definir si el baseline se licencia, se vende, se aporta o no se mueve.
- [ ] Valorar a mercado cualquier operación vinculada.
- [ ] Definir residencia y trabajo real de dirección/desarrollo en Chipre.
- [ ] Aprobar contratos de empleo, contractor y cesión para desarrollo futuro.

**Bloqueo actual:** no crear todavía el repositorio canónico bajo una entidad
que podría no ser la propietaria final. Se puede diseñar y documentar, pero el
core nuevo sustancial debe esperar a este gate.

### Gate 2 — constitución y operación real

- [ ] Incorporar y registrar fiscalmente Cyprus Ltd.
- [ ] Cuenta bancaria, contabilidad, nóminas y proveedores a nombre correcto.
- [ ] Dirección efectiva, decisiones, personal y control de riesgos reales.
- [ ] GitHub organization, repositorio, dominios y proveedores alineados con
  los contratos y la entidad propietaria.
- [ ] Cost centres por activo desde la primera factura.

### Gate 3 — KekoPilot foundation

- [ ] Repositorio privado nuevo con `main` protegida y PRs cortas.
- [ ] Next.js/TypeScript/PostgreSQL/Drizzle/Docker sin dependencia obligatoria
  de Vercel o Neon.
- [ ] `organizations`, `workspaces`, miembros, RBAC y aislamiento estricto.
- [ ] API/eventos versionados para consumir el CRM actual.
- [ ] Primero extraer Agent OS; después Creator, Lead, Campaign y Revenue
  Intelligence, uno a uno.
- [ ] Cada reutilización desde SocialPro enlaza componente, commit origen,
  licencia/cesión y transformación realizada.

### Gate 4 — ledgers y evidence pack

- [x] Registro inicial de proyectos, tiempo y evidencia con historial append-only.
- [x] Registro documental con ubicación, estado, versión, huella y revisión profesional separada.
- [ ] IP Registry formal, ownership events y versiones.
- [ ] Experimentos I+D, costes reales conciliados y revisión del asesor.
- [ ] Reconciliación de usage IA con factura/pago real.
- [ ] Revenue/IP allocation con estados de revisión.
- [ ] Nexus por activo y ejercicio, siempre marcado `Draft`.
- [ ] Exportación CSV/JSON/PDF con audit trail.

### Gate 5 — monetización y claim

- [ ] Contratos SaaS/licencia o estudio funcional de embedded income.
- [ ] Contabilidad separada por activo y ejercicio.
- [ ] Transfer pricing y local/minimum file cuando corresponda.
- [ ] Ruling opcional con hechos cerrados y metodología concreta.
- [ ] Self-assessment anual revisado y firmado por asesor.

## Reglas fiscales que el software debe imponer

El sistema no puede:

- declarar automáticamente un activo, coste o ingreso como cualificado;
- convertir horas ahorradas en coste;
- inferir horas desde commits;
- tratar todas las llamadas IA o ingresos de agencia como IP;
- borrar versiones anteriores de evidencia;
- presentar un porcentaje de embedded income sin estudio funcional.

El sistema sí debe:

- conservar procedencia y propiedad por evento;
- reconciliar cada cifra con documento y pago;
- separar partes vinculadas e independientes;
- calcular Nexus durante la vida del activo;
- mantener estados `candidate` y `advisor_approved` distintos;
- permitir correcciones sin destruir el historial.

## Decisión de arquitectura

No crear una rama permanente `production-v2` ni reconstruir el CRM completo.
La arquitectura objetivo es:

```text
SocialPro Agency CRM (PRE-EXISTING)
                 |
          versioned API/events
                 |
                 v
KekoPilot Platform (new product, owner TBD)
  Agent OS -> Creator -> Lead -> Campaign -> Revenue Intelligence
```

`kekopilot.com` puede permanecer aparcado y protegido hasta completar Gate 1.
Comprar el dominio fue una reserva de marca; no determina la propiedad del
software ni obliga a publicar antes de tiempo.
