# Registro de cambios de instrucciones aprobados

Fecha de comprobación documental: **2026-09-05T13:12:52.207Z**. Alcance: instrucciones aprobadas, su sincronización y validación local. **Este registro no acredita que el CRM, n8n, Discord, los agentes ni la producción hayan terminado su validación o estén activos.** Sus resultados operativos se documentan aparte.

## Alcance e inventario

Se modificaron **53 archivos de instrucciones**: **19** en el checkout de auditoría, **16** en `proyectozack`, **16** en `pz-skills` y **2** en la caché local del plugin Vercel. Este informe nuevo y el inventario privado de comprobación no forman parte de esos 53.

| Ubicación lógica | Base comprobada | Instrucciones modificadas |
|---|---|---:|
| `socialpro-audit-2026-09-04` | `40834b87215b64e391c19006ac492ceb32295877` | 19 |
| `proyectozack`, rama `fix/vps-migration-image` | `e52357038536f6a6e50ae359143e08f31c5f7e25` | 16 |
| `pz-skills`, rama `master` | `f3e878df80ac9821f71b9edd19cbeb17033822b3` | 16 |
| Caché local `.codex/plugins/cache/` | Vercel `0.21.4`; no baseline Git del plugin | 2 |

Las rutas siguientes son relativas a su ubicación lógica. No se publican rutas personales absolutas, secretos ni datos de negocio. Los hashes son **SHA-256 del texto UTF-8 normalizando exclusivamente CRLF → LF**, incluidos espacios y salto final; no son firmas de despliegue.

### Dieciséis rutas comunes en los tres checkouts: 48 archivos

Cada fila existe y tiene el contenido indicado en auditoría, `proyectozack` y `pz-skills`. No representa sólo una copia.

| Ruta exacta en cada checkout | SHA-256 final normalizado |
|---|---|
| `AGENTS.md` | `6f6b152ceb952f3721da604186f41de29677cc6521809528b5a293d835069ad7` |
| `CLAUDE.md` | `19722bc0faecdab3bdb9beeb197c38857eb5dfa8539cc58ba5901b1f05c6f5f3` |
| `.agents/skills/typescript-strict/SKILL.md` | `c10e0b3cadc0a8b1fb7399c95979154a7cabf5d32e3e1f3eb4614b760f6908df` |
| `.agents/skills/react-email/SKILL.md` | `d834a826bcf5dd7cd92d0ed56b7264b3f55f5f030ee99acfa408c32447e31a81` |
| `.agents/skills/socialpro-creator-targets/SKILL.md` | `ef0030a2e137ddaf344c69eddcb9937af75d60ad347f9a434e4ad21100c95240` |
| `.agents/skills/socialpro-creator-targets/ENDPOINTS.md` | `bddcf52b80bfe9ec3c3edab6e9a72989c961805e90afd37a77b589abfe409187` |
| `.agents/skills/socialpro-creator-targets/FIRECRAWL.md` | `daec12055a14d91a89496e7c0d53e9c96793e78712b9a07604e7bd8150045053` |
| `.agents/skills/drizzle-safe-migrations/SKILL.md` | `6872eef8a173d515084ba20b774174263d3342e9557b9ee0f73bbd6afcc89c71` |
| `.agents/skills/drizzle-safe-migrations/references/production-playbook.md` | `9f731a29b998efe76462f2468d614b74a50ac030834a2ee6359bf128f61ada25` |
| `.claude/skills/typescript-strict/SKILL.md` | `c10e0b3cadc0a8b1fb7399c95979154a7cabf5d32e3e1f3eb4614b760f6908df` |
| `.claude/skills/react-email/SKILL.md` | `d834a826bcf5dd7cd92d0ed56b7264b3f55f5f030ee99acfa408c32447e31a81` |
| `.claude/skills/socialpro-creator-targets/SKILL.md` | `ef0030a2e137ddaf344c69eddcb9937af75d60ad347f9a434e4ad21100c95240` |
| `.claude/skills/socialpro-creator-targets/ENDPOINTS.md` | `bddcf52b80bfe9ec3c3edab6e9a72989c961805e90afd37a77b589abfe409187` |
| `.claude/skills/socialpro-creator-targets/FIRECRAWL.md` | `daec12055a14d91a89496e7c0d53e9c96793e78712b9a07604e7bd8150045053` |
| `.claude/skills/drizzle-safe-migrations/SKILL.md` | `6872eef8a173d515084ba20b774174263d3342e9557b9ee0f73bbd6afcc89c71` |
| `.claude/skills/drizzle-safe-migrations/references/production-playbook.md` | `9f731a29b998efe76462f2468d614b74a50ac030834a2ee6359bf128f61ada25` |

### Tres rutas modificadas sólo en auditoría

Estos documentos no se copiaron a los otros dos checkouts.

| Ruta exacta | SHA-256 final normalizado |
|---|---|
| `docs/pickup.md` | `d60d6df05f15e480ac9584b0712f63df876efaeb7ba6bf0950fa5c278ebc6ecf` |
| `docs/stabilization-2026-09-05/pr-publication-gate.md` | `75f9963416a7168411a5b5266daf954375f00b896f0770d23bd0bb8fe620fce6` |
| `docs/stabilization-2026-09-05/workflow-reactivation-gates.md` | `9a2f475e6d9d8deae467129ad3ea3ef3a6d7220f62e0ecd9fccb4eac779aa105` |

### Dos rutas en caché local del plugin

Las rutas se resuelven desde `.codex/plugins/cache/`. La inspección final fue de sólo lectura; los cambios los había realizado previamente el operador principal.

| Ruta exacta | SHA-256 final normalizado |
|---|---|
| `openai-curated-remote/vercel/0.21.4/skills/verification/SKILL.md` | `dc56d09f94fab579f91eaf627b64168a1aef64b5852a39df5c8ec22e3181c053` |
| `openai-curated-remote/vercel/0.21.4/skills/investigation-mode/SKILL.md` | `8bb705f35ed22259fd0cddedac5e3b546307745aebdfaceab5115570bd721621` |

No se dispone en este registro de un original Git de la caché ni de su hash anterior. La descripción del comportamiento previo procede de la revisión aprobada; no debe presentarse como un diff binario reconstruido o como una comparación con la distribución original del proveedor.

## Resumen del diff aprobado

| Grupo | Antes / problema | Cambio aplicado y límite conservado |
|---|---|---|
| `AGENTS.md` y `CLAUDE.md` | Guías históricas, referencias ausentes, secuencia rígida de capas y afirmaciones de comandos/entornos que ya no eran universales | Distinguen historia, autorización vigente, precondición técnica y resultado. No repetir aprobación del mismo alcance; nuevos efectos o permisos siguen requiriendo su autorización. Preservan diseño publicado, 2FA, permisos y datos desconocidos frente a cero. Cambiar sólo capas afectadas; comandos documentados no autorizan ejecutarlos. |
| Comandos y referencias de las guías raíz | Migrador descrito como neon-http, referencias antiguas a CSS/TypeScript y CI asumido igual en ramas distintas | Reflejan runner `pg`/node-postgres, precedencia de entorno y separación generación/aplicación. La tabla CI exige inspección del checkout. Gates internos autosuficientes y documentos fechados opcionales si existen, sin fingir una dependencia local ausente. |
| `docs/pickup.md` | Reanudar por receta, incluido servidor HTTP genérico, sin resolver historia/estado | Revisa checkout y continuidad vigente; conserva cambios ajenos e identidades de operaciones interrumpidas. No servir el repositorio ni ejecutar migraciones, seeds, syncs o workers como sonda. No convierte una entrega incierta en permiso de retry. |
| Gates n8n y publicación del PR | “Inicial”, “condicional” o “pendiente” podía interpretarse como nueva confirmación humana pese a la autorización posterior | Estado histórico fechado separado de alcance vigente y evidencia por familia. A/B/C depende de efectos y controles; la aprobación interna no habilita rutas financieras/externas hermanas ni publicación remota. No declarar activación o E2E por redactar el procedimiento. |
| `typescript-strict` | Referencia inexistente `.Codex/rules/typescript.md` en una copia | Ambas copias apuntan a la regla existente `.claude/rules/typescript.md`, desde raíz. Sin relajar reglas TypeScript. |
| `react-email` | Preguntas obligatorias incluso con brief, marca y configuración disponibles | Reutiliza contexto y diseño aprobado. Pregunta sólo por información crítica no inferible; un borrador local puede continuar con límites explícitos. No inventa host/destinatario ni autoriza enviar, provisionar o cambiar credenciales. |
| `socialpro-creator-targets` y sus dos referencias | Preflight Firecrawl universal, responsable histórico y recetas de obtención/copia de secretos | Discovery/deep y refresh tienen dependencias distintas: refresh no exige ni consume Firecrawl. Usa responsable actual y custodia segura; ausencia de credencial necesaria o 401/403/503 de configuración bloquea la operación afectada, no se oculta como éxito. No crea/rota secretos por inferencia. |
| `drizzle-safe-migrations` y playbook | Comandos `bun run db:generate`/`typecheck` inexistentes en el proyecto | Inspección previa de package/config/runner y comandos npm/npx reales. Aplicación separada a destino autorizado; conservar backup/restauración/staging/rollback. Sin `push` en DB persistente ni manipulación del journal para fabricar éxito. Fixtures vacías no prueban la cadena histórica. |
| Plugin `verification` | Detenerse en la primera frontera rota podía terminar prematuramente una reparación | El diagnóstico sólo informa; una reparación aprobada corrige y revalida. Se detiene la operación peligrosa, no trabajo seguro independiente. Verificación proporcional incluida en “dejar funcionando”, no una tarea adicional que haya que contratar. |
| Plugin `investigation-mode` | Encontrar la causa podía confundirse con terminar el arreglo; añadir logs podía extender un diagnóstico de lectura | Evita repetir investigación sin señal, continúa reparación aprobada y revalida. Logging acotado/redactado sólo con autorización de cambios; lectura sola propone, no modifica. No altera alcance ni permisos de herramientas. |

No se cambiaron filtros geográficos/idioma, criterios de compatibilidad ni reglas comerciales de Creator Targets. Se conservaron los presupuestos indicados en la skill (default aproximado 80 créditos; deep aproximado 250 y confirmación previa de su coste), los límites/reintentos/cuotas y la detención por dependencia necesaria. Son límites existentes de instrucciones, no gasto realizado ni aprobación de nuevos consumos.

## Sincronización sin sobrescribir trabajo ajeno

Antes de editar cada uno de los **32 destinos**, su contenido se comparó con `git show 40834b87215b64e391c19006ac492ceb32295877:<ruta>` del checkout de auditoría y con la nueva versión. Los 32 coincidían con el original, salvo los finales de línea habituales de Windows: **0 conflictos de contenido**. Las modificaciones se aplicaron con `apply_patch`; no se sustituyeron archivos divergentes.

La adaptación común de las dos guías raíz se aplicó también en auditoría. No se copiaron a ramas antiguas los documentos de estabilización ni se cambiaron sus workflows CI para forzar igualdad:

- `proyectozack` conserva CI/E2E que usa secretos de DB/servicios y una etapa de migración E2E.
- `pz-skills` tiene PG17 desechable/`push --force`, pero conserva secretos Resend/Auth; no equivale a los placeholders del audit.
- Ambos difieren del audit en el job de unit tests y conservan `--passWithNoTests`; ninguna de estas configuraciones se ejecutó en esta subfase.
- Runner, config, resolución de entorno, IndexNow y hook se compararon por contenido; aliases de build/migración coinciden. Esto valida la descripción de comandos, no autoriza ejecutarlos ni prueba sus destinos efectivos.

Se conservaron el cambio previo de `.gitignore` en `pz-skills` y los archivos no versionados existentes (`output/`, `.agents/skills/avatar-ugc/`, `.claude/commands/`). No se hicieron commits, push, migraciones, instalaciones, rotaciones, pruebas con servicios externos ni cambios de runtime en esta subfase.

## Validaciones documentales

| Comprobación | Resultado y alcance |
|---|---|
| Inventario actual | 53 archivos inspeccionados; 19 + 16 + 16 + 2. |
| Igualdad de copias | 32 destinos iguales al contenido final de auditoría normalizando sólo CRLF/LF; 21 pares de skills .agents/.claude byte a byte idénticos entre los tres checkouts. |
| Frontmatter | 26 `SKILL.md` con YAML válido y name/description de texto; frontmatter de `docs/pickup.md` también parseado. |
| Referencias Markdown locales | 159 enlaces locales encontrados en las 51 instrucciones de los checkouts resuelven; 0 rotos en ese conjunto. No se verificó disponibilidad HTTP de documentación externa. |
| Referencias de raíz en destinos | 34 comprobaciones de presencia de reglas/docs/schema/config/runner: PASS (17 rutas × 2 destinos). Los dos documentos fechados ausentes en ambos destinos son explícitamente opcionales, no una dependencia falsa. |
| Formato y tamaño | `git diff --check` PASS sobre los archivos cambiados del audit y los destinos; todas las instrucciones inventariadas tienen menos de 500 líneas. |
| Huellas | SHA-256 finales en las tablas; el inventario privado del operador conserva también hashes anteriores y hashes raw finales de los 32 destinos. |
| Runtime / CI / E2E | No ejecutados ni acreditados por esta edición de instrucciones. No sustituir por un PASS documental. |

Estas comprobaciones verifican estructura, referencias, comandos inspeccionados y sincronización. **No son una evaluación integral del comportamiento del modelo ni una auditoría completa de los ejemplos heredados del plugin.** En particular, la regla de redacción no certifica por sí sola todos los ejemplos de logging existentes.

## Riesgos y criterio de uso

1. **Autonomía no significa autoridad nueva.** “Continuar hasta funcionar” mantiene el mismo alcance, destino y efectos; no habilita gastos, destinatarios nuevos, disclosures de datos, bancos, facturas, contratos, 2FA ni permisos de herramientas no aprobados. Ante entrega incierta se conserva la identidad y se investiga antes de repetir.
2. **Una fecha o un archivo no prueba estado actual.** Las pausas/contenciones históricas y resultados locales no son lecturas runtime. Una familia interna puede activarse dentro de la autorización vigente sólo tras sus gates; ninguna frase activa el grafo completo o sus efectos excluidos.
3. **No prometer salud falsa.** Separar implementado, probado, desplegado, activo y funcionando. Encontrar la causa, un contenedor healthy, HTTP 200, mocks o una canary local no completan un recorrido de entrega.
4. **Caché no durable.** Reinstalar o actualizar el plugin Vercel puede sobrescribir sus dos cambios locales. Tras una actualización, comparar alcance y criterios de terminación antes de reutilizarlos; este registro no fija la versión, no desactiva actualizaciones y no presupone persistencia.
5. **Ramas y autorizaciones cambian.** Volver a inspeccionar contratos técnicos cuando cambien archivos/estado. No copiar estas instrucciones por encima de ediciones nuevas ni reutilizar el resumen fechado como consentimiento perpetuo para tareas distintas.

El cierre de este documento es **cambio de instrucciones implementado y validado localmente**. La finalización funcional del circuito de automatización queda fuera de esta declaración.
