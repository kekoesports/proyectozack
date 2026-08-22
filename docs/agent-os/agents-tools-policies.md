---
summary: 'Catálogo de agentes, herramientas, permisos, políticas de aprobación, memoria y rollout de Zack Agent OS.'
read_when:
  - Implementing an agent or tool
  - Reviewing what an agent may read or change
  - Adding approvals, schedules or external integrations
---

# Agentes, tools y políticas de Zack Agent OS

## 1. Regla fundamental

Un modelo nunca recibe autoridad por el texto de su prompt. La autoridad procede de:

1. agente configurado;
2. actor humano o máquina;
3. RBAC actual del CRM;
4. allowlist de tools;
5. clasificación de la acción;
6. política de aprobación;
7. presupuesto y kill switch;
8. idempotencia;
9. estado del run.

La validación se ejecuta en el servidor inmediatamente antes de cada tool call.

## 2. Modos de agente

### `shadow`

- Ejecuta lecturas y análisis.
- No crea tareas, drafts, notificaciones ni side effects.
- Compara su recomendación con la actuación humana.
- Es el modo obligatorio para cualquier agente nuevo durante al menos 14 días o un número suficiente de casos.

### `recommend`

- Puede crear recomendaciones o borradores internos.
- No ejecuta efectos externos.
- Las acciones de escritura real quedan en aprobación.

### `execute`

- Puede ejecutar únicamente tools cuya política lo permita.
- Acciones externas y privilegiadas siguen necesitando aprobación.
- No existe un modo que permita pagos, SQL libre o shell arbitrario.

## 3. Clases de acción

| Clase | Ejemplos | Política base |
|---|---|---|
| `read` | consultar campañas, métricas o salud | automática si hay permiso |
| `internal_draft` | crear borrador de deal, lead, email o post | automática en recommend/execute; simulada en shadow |
| `internal_write` | crear tarea, asignar responsable, actualizar dato no sensible | aprobación dinámica; inicialmente siempre |
| `external_side_effect` | enviar email, publicar Discord, abrir issue real | aprobación obligatoria + outbox/n8n |
| `privileged` | reiniciar servicio, backup, rollback | aprobación admin obligatoria + control service |
| `forbidden` | pago, transferencia, SQL o shell libre | no existe tool ejecutable |

La clasificación de una tool no puede rebajarse desde la UI. Cambiarla requiere PR y revisión.

## 4. Contrato de salida de los agentes

Los agentes programados no devuelven texto libre sin estructura. Resultado mínimo:

```typescript
type AgentReport = {
  readonly title: string;
  readonly executiveSummary: string;
  readonly severity: 'info' | 'warning' | 'high' | 'critical';
  readonly findings: readonly {
    readonly code: string;
    readonly title: string;
    readonly summary: string;
    readonly evidenceRefs: readonly string[];
    readonly severity: 'info' | 'warning' | 'high' | 'critical';
    readonly confidence: 'low' | 'medium' | 'high';
  }[];
  readonly recommendations: readonly {
    readonly action: string;
    readonly rationale: string;
    readonly toolProposalId?: number;
  }[];
  readonly dataFreshness: readonly {
    readonly source: string;
    readonly observedAt: string;
    readonly status: 'fresh' | 'stale' | 'unknown';
  }[];
};
```

La UI puede renderizar este contrato y conservar una versión markdown para lectura humana.

## 5. Zack Guardian

### Misión

Vigilar la disponibilidad y salud operativa de SocialPro, detectar anomalías con reglas deterministas y utilizar IA para correlacionar, explicar y priorizar.

### Fuentes

- `/api/health/live` y `/api/health/ready`;
- collector del VPS;
- PostgreSQL health;
- estado de storage;
- Uptime Kuma;
- heartbeats de backups;
- n8n health y ejecuciones fallidas;
- GitHub Actions;
- despliegues y errores de aplicación;
- durante la migración: Vercel y Neon.

### Rutinas

| Rutina | Frecuencia | Propietario |
|---|---|---|
| `guardian-daily` | 08:30 Europe/Madrid | Agent scheduler |
| `guardian-weekly-capacity` | lunes 09:00 | Agent scheduler |
| `guardian-event-analysis` | evento high/critical | Event processor |
| `guardian-backup-check` | cada 6 h tras ventana de backup | Monitor/heartbeat |

### Reglas deterministas iniciales

Valores exactos deben poder configurarse sin contener secretos:

```text
Disk warning >= 80 %
Disk critical >= 90 %
Inodes warning >= 80 %
RAM warning >= 85 % sostenido
Swap critical si crecimiento sostenido + presión de RAM
Load warning basado en vCPU y duración, no un pico aislado
Backup warning si supera RPO objetivo
Worker warning si heartbeat > 90 s
App critical tras 3 fallos consecutivos
DB critical si ready check falla
TLS warning cuando expira en < 21 días
n8n warning por workflow crítico fallido
```

La IA no decide si el disco está al 90 %; recibe ese hecho ya calculado.

### Tools de lectura MVP

```text
getSystemHealthSnapshot
getApplicationHealth
getDatabaseHealth
getStorageHealth
getBackupHealth
getAgentWorkerHealth
getN8nHealth
getN8nFailureSummary
getGithubCiSummary
getRecentDeploymentSummary
getRecentRuntimeErrorSummary
getOpenOperationalIncidents
```

### Tools de escritura futura

| Tool | Clase | Aprobación |
|---|---|---|
| `createIncidentTask` | internal_write | Inicialmente siempre |
| `acknowledgeIncident` | internal_write | Siempre |
| `retryApprovedN8nWorkflow` | privileged | Admin |
| `runApprovedBackup` | privileged | Admin |
| `restartApprovedService` | privileged | Admin |
| `rollbackApprovedDeployment` | privileged | Admin + confirmación reforzada |
| `enableMaintenanceMode` | privileged | Admin + confirmación reforzada |

### Prohibiciones

- No montar Docker socket en el worker.
- No ejecutar comandos arbitrarios.
- No editar firewall/SSH.
- No limpiar disco sin una operación allowlisted.
- No aplicar migraciones.
- No reiniciar PostgreSQL automáticamente.
- No interpretar logs sin redacción previa.

### Criterios para salir de shadow mode

- mínimo 14 días;
- cero exposición de secretos;
- falsos positivos críticos inferiores al umbral acordado;
- todos los eventos críticos detectados por reglas;
- coste dentro del presupuesto;
- revisión humana de una muestra de informes;
- ningún side effect.

## 6. Zack CRM Steward

### Misión

Detectar problemas operativos y de calidad en datos sin inventar reglas de negocio ni modificar registros silenciosamente.

### Rutinas

```text
crm-steward-daily      09:00 Europe/Madrid
crm-steward-weekly     lunes 09:30
crm-steward-on-deal    evento de cambio de campaña
```

### Tools de lectura MVP

```text
getOperationalCampaignSummary
getCampaignsMissingRequiredFields
getCampaignsPastDeadline
getCampaignsWithoutOwner
getCampaignTrackingAnomalies
getUnlinkedTrackerSummary
getOverdueTaskSummary
getBrandFollowupGaps
getBrandContactQualitySummary
getTalentDataQualitySummary
getStaleTalentMetrics
getContractLinkageGaps
getInvoiceLinkageGaps
```

Todas deben:

- utilizar queries de dominio existentes o nuevas;
- aplicar visibilidad/RBAC;
- devolver datos mínimos;
- evitar importes salvo permiso financiero;
- incluir IDs internos y `updatedAt` para freshness;
- limitar resultados y proporcionar totales.

### Tools de borrador/escritura

| Tool | Clase | Política |
|---|---|---|
| `createTaskSuggestion` | internal_draft | Automática en recommend |
| `createCrmTask` | internal_write | Aprobación inicialmente |
| `assignCampaignOwner` | internal_write | Aprobación |
| `scheduleBrandFollowup` | internal_write | Aprobación |
| `markRecommendationDismissed` | internal_write | Permitida al usuario |

No puede:

- archivar campañas o talentos;
- cambiar importes;
- completar tareas masivamente;
- enlazar trackers ambiguos;
- cambiar estado financiero;
- modificar datos fiscales.

### Salida diaria esperada

```text
Urgente
Esta semana
Calidad de datos
Tareas propuestas
Cambios desde el informe anterior
```

Cada hallazgo debe apuntar a una entidad real del CRM.

## 7. Zack Deal Clerk

### Misión

Transformar una instrucción natural en un borrador de deal válido, idempotente y revisable.

### Flujo

```text
mensaje
→ extracción estructurada
→ búsqueda de marca/talento
→ validación
→ preguntas por campos ausentes
→ borrador de automatización
→ revisión humana
→ aprobación por flujo existente
→ n8n crea Sheet/Docs
```

### Tools MVP

```text
searchCrmBrand
searchTalent
getDealDraftRequirements
validateProposedDeal
createAutomationDealDraft
updateAutomationDealDraft
getAutomationDealDraft
listUserRecentDealDrafts
```

### Políticas

- `createAutomationDealDraft`: `internal_draft`.
- `updateAutomationDealDraft`: solo borradores creados por el usuario/agente o accesibles por rol.
- Nunca llama directamente a `createCampaign`.
- Nunca aprueba el borrador.
- Nunca genera importes no proporcionados.
- No convierte moneda de forma implícita.
- Si hay dos marcas o talentos posibles, pregunta.
- La clave idempotente deriva de source + external message ID, no de texto volátil.
- Los cuatro conceptos económicos se mantienen separados:
  - pago marca;
  - pago talento;
  - especie talento;
  - especie comunidad.
- `otro` exige descripción.

### Criterios de calidad

- precisión de extracción >= 90 % en dataset de evaluación;
- cero campañas duplicadas;
- cero aprobación automática;
- preguntas limitadas a campos realmente ausentes;
- resumen final reproduce exactamente importes, moneda y cantidades.

## 8. Zack Growth

### Misión

Convertir oportunidades entrantes o investigadas en leads limpios, puntuados y listos para revisión.

### Primera etapa recomendada

Empezar por inbox y fuentes proporcionadas, no por navegación autónoma generalista.

```text
email/webhook/URL proporcionada
→ extracción
→ dedupe CRM
→ enriquecimiento público permitido
→ scoring explicable
→ lead draft
→ outreach draft
```

### Tools de lectura

```text
searchExistingBrandOrContact
getInboundLeadQueue
getLeadScoringRules
getCreatorInventoryForGeoAndVertical
getPublicCompanyProfileFromAllowedUrl
getRecentBrandInteractions
```

### Tools de borrador

```text
createBrandLeadDraft
updateBrandLeadDraft
createOutreachEmailDraft
createLeadResearchTask
```

### Tools externas futuras

| Tool | Clase | Política |
|---|---|---|
| `sendApprovedOutreachEmail` | external_side_effect | Aprobación siempre + n8n |
| `publishApprovedDiscordLeadAlert` | external_side_effect | Aprobación/configuración |

### Scoring inicial explicable

Factores posibles:

- vertical: CS2, Casino/iGaming, VALORANT, GTA, tecnología;
- GEO cubierto;
- tipo de campaña;
- compatibilidad con talento disponible;
- presupuesto confirmado/no confirmado;
- contacto identificable;
- historial previo;
- restricciones de compliance;
- urgencia.

El score debe mostrar contribuciones y no basarse únicamente en una conclusión del modelo.

### Prohibiciones

- scraping detrás de login;
- automatización de LinkedIn;
- compra de bases de datos;
- envío masivo;
- inventar emails;
- contacto automático con marcas sin revisión;
- guardar datos no necesarios;
- evadir términos de uso o controles anti-bot.

## 9. Zack SEO

### Misión

Analizar rendimiento y salud SEO, priorizar oportunidades y preparar briefs/borradores sin publicar automáticamente.

### Fuentes

- Search Console;
- Analytics;
- sitemap;
- datos de páginas y posts del CRM;
- IndexNow;
- errores de aplicación;
- métricas Core Web Vitals disponibles;
- inventario de talentos y casos.

### Rutinas

```text
seo-weekly-report       lunes 10:00
seo-indexing-check      diario 10:30
seo-content-opportunity semanal
```

### Tools de lectura

```text
getSearchConsoleSummary
getAnalyticsOrganicSummary
getSeoTechnicalHealth
getIndexingIssueSummary
getContentInventory
getInternalLinkGaps
getTalentPageFreshness
getKeywordOpportunitySummary
getPublishedContentPerformance
```

### Tools de borrador

```text
createSeoRecommendation
createContentBriefDraft
createPostDraft
createTalentSeoUpdateDraft
```

### Tools externas futuras

| Tool | Clase | Política |
|---|---|---|
| `publishApprovedPost` | external_side_effect | Aprobación siempre |
| `submitApprovedIndexNowUrls` | external_side_effect | Puede automatizarse solo con allowlist y rate limit |

### Guardrails

- No publicar sin revisión.
- No generar afirmaciones no respaldadas sobre talentos/marcas.
- No crear páginas regionales sin estrategia canonical/hreflang.
- No modificar cientos de metadatos en una sola ejecución.
- No confundir correlación de tráfico con causalidad.
- Toda recomendación indica fuente, periodo y freshness.

## 10. Zack Dev

### Misión

Vigilar la entrega de software y preparar diagnósticos o cambios de bajo riesgo sin controlar producción.

### Fuentes

- GitHub Actions;
- PRs e issues;
- releases e imágenes Docker;
- runtime errors;
- health checks;
- dependencias;
- informes de seguridad.

### Tools de lectura

```text
getGithubWorkflowFailures
getOpenPullRequestSummary
getRecentCommitSummary
getRuntimeErrorGroups
getDependencyAlertSummary
getMigrationDriftStatus
getDeploymentHealth
getRecentIncidentTimeline
```

### Tools de borrador/escritura

| Tool | Clase | Política |
|---|---|---|
| `createIssueDraft` | internal_draft | Automática |
| `openApprovedGithubIssue` | external_side_effect | Aprobación |
| `prepareCodeChangePlan` | internal_draft | Automática |
| `createSandboxBranch` | internal_write | Aprobación/configuración |
| `openApprovedPullRequest` | external_side_effect | Aprobación |

Nunca puede:

- fusionar PRs;
- desplegar producción;
- modificar secrets;
- aplicar migraciones;
- hacer force push;
- ejecutar código no revisado en el VPS;
- cerrar incidentes automáticamente.

## 11. Tools compartidas

### Lectura de documentación

`getCrmHelpContext` existente se adapta al registro común. Debe leer documentación versionada y devolver extractos limitados.

### Creación de tareas

Una única tool de dominio, no una implementación por agente:

```text
proposeCrmTask
createApprovedCrmTask
```

### Notificaciones

Los agentes no llaman directamente a Discord/Resend. Crean un evento outbox con destino y payload redacted. n8n entrega y confirma.

### URLs externas

No existe `fetchAnyUrl`. La tool segura debe:

- permitir `https`;
- resolver DNS y bloquear redes privadas/loopback;
- limitar redirects;
- limitar tamaño y timeout;
- allowlist de dominios por caso;
- no enviar cookies/headers internos;
- validar content type;
- registrar URL normalizada.

## 12. Matriz de aprobación

| Acción | Shadow | Recommend | Execute |
|---|---|---|---|
| Lectura permitida | simula/ejecuta | ejecuta | ejecuta |
| Crear recomendación | solo output | ejecuta | ejecuta |
| Crear draft interno | simula | ejecuta | ejecuta |
| Crear tarea real | simula | aprobación | política dinámica |
| Actualizar entidad | simula | aprobación | aprobación/configuración |
| Enviar email/Discord | simula | aprobación | aprobación |
| GitHub issue/PR | simula | aprobación | aprobación |
| Reiniciar servicio | simula | aprobación admin | aprobación admin |
| Backup/rollback | simula | aprobación admin | aprobación admin |
| Pago/transferencia | bloqueado | bloqueado | bloqueado |
| SQL/shell libre | bloqueado | bloqueado | bloqueado |

## 13. RBAC

Las tools reutilizan `requirePermission`/`hasPermission` y las queries de ownership existentes. No se mantiene una matriz independiente que pueda divergir.

Se propone añadir módulos/acciones solo si son necesarios:

```text
module: agents
  read
  write
  approve
  manage
  audit

module: infrastructure
  read
  operate
```

Orientación inicial:

| Permiso | Roles sugeridos |
|---|---|
| agents:read | admin, manager, ops, analyst, finance, talent_manager, editor |
| agents:write | admin, manager, ops |
| agents:approve | depende de la tool; siempre combina permiso de dominio |
| agents:manage | admin |
| agents:audit | admin, admin_limited_tasks |
| infrastructure:read | admin, ops |
| infrastructure:operate | admin |

No conceder a `brand` ni usuarios externos.

## 14. Memoria por agente

| Agente | Puede memorizar | No puede memorizar |
|---|---|---|
| Guardian | runbooks, umbrales, topología lógica | secrets, IPs sensibles, logs crudos |
| CRM Steward | SOP y definiciones de calidad | importes de deals, PII |
| Deal Clerk | estructura y preferencias generales | importes concretos entre conversaciones |
| Growth | ICP, verticales, GEO y tono | listas compradas, datos privados innecesarios |
| SEO | estrategia, taxonomía y reglas editoriales | credenciales, datos personales |
| Dev | ADRs, convenciones y runbooks | tokens, código secreto fuera de Git |

Toda memoria incluye fuente y caducidad. El agente no puede afirmar que algo es memoria verificada si solo lo infirió.

## 15. Política de presupuesto

Configuración inicial sugerida para el piloto, no hardcodeada:

```text
Global monthly budget: 10 USD equivalent
Guardian: 2
CRM Steward: 2
Deal Clerk: 1
Growth: 3
SEO: 1
Dev: 1
```

Además:

- un máximo de turns por run;
- una concurrencia por agente;
- contexto máximo;
- modelo económico por defecto;
- modelos superiores solo por política explícita;
- sin consumo de modelo para health checks normales;
- agrupación de eventos repetidos antes de llamar a IA.

## 16. Evaluaciones

Cada agente tendrá fixtures sin datos reales:

```text
src/__tests__/agents/evals/guardian.cases.ts
src/__tests__/agents/evals/crm-steward.cases.ts
src/__tests__/agents/evals/deal-clerk.cases.ts
src/__tests__/agents/evals/growth.cases.ts
src/__tests__/agents/evals/seo.cases.ts
src/__tests__/agents/evals/dev.cases.ts
```

Métricas:

- tool correcta;
- argumentos válidos;
- no tool cuando no procede;
- bloqueo de acción prohibida;
- aprobación solicitada correctamente;
- precisión de extracción;
- citas/evidence refs;
- datos sensibles no expuestos;
- coste y turns;
- falsos positivos y negativos.

No usar nombres, importes ni emails reales en fixtures.
