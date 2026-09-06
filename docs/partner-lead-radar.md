# Radar diario de partners CS2

El radar investiga **empresas**, no personas/creadores, y conserva cada informe
en el CRM. n8n despierta al guard para publicar un digest interno en Discord y
registrar el ACK. La base de datos es la fuente de verdad; Discord es el aviso.
Ningún semáforo constituye aprobación jurídica ni autorización para contactar.

## Estado comprobado — corte del 6 septiembre 2026, 01:50 UTC

**Actualización 11:05 UTC:** el nuevo destino crm-leads ya está instalado, con
guía fijada y lote real 3 entregado/ACK confirmado; la automatización diaria
existente también está actualizada. [Evidencias y límites actuales](discord-routing-release-2026-09-06.md).
El lote de hoy añade un descarte, no una nueva oportunidad. Lo siguiente conserva
los recibos históricos del canal anterior y no debe reenviarse.

Según las [comprobaciones reales](automation-real-checks-2026-09-06.md), Partners
ya completó el recorrido CRM → n8n → guard → Discord:

| Lote CRM | Resultado comprobado |
|---|---|
| 1, TEST interno | [Mensaje real](https://discord.com/channels/1522153792592806018/1533123515023360114/1545958478978228336), ACK a las 00:47:04 UTC y repetición antes/después de reiniciar el mismo guard sin otro mensaje. |
| 2, `cs2-radar-2026-09-05` | SkinBaron, Skinport, CSFloat y CSGORoll: tres revisables y uno descartado. [Mensaje real](https://discord.com/channels/1522153792592806018/1533123515023360114/1545959640989179974) a las 00:51:40.953 UTC, ACK a las 00:51:41.115 UTC y contenido exacto leído y comprobado. |

El CRM muestra los cuatro registros y ambos lotes con ACK. El lote real mantiene
la fecha original de investigación; no se contactó a las empresas. Las ocho
familias n8n estaban activas en ese corte y el transporte diario local por SSH
ya estaba instalado en el VPS. **Esto no acredita aún el horario diario
desatendido ni la nueva ruta de canales.**

La investigación `cs2-radar-2026-09-06` sobre BitSkins está preparada localmente
con resultado `red/discard` por el anuncio oficial de cierre. No se presenta
como oportunidad activa ni como lote 3 ya importado/entregado. Permanece retenida
hasta comprobar el nuevo destino, sin modificar sus fechas ni sus bytes.

## Cuatro destinos elegidos — nueva ruta pendiente de despliegue

Estos canales ya existen en el servidor interno `1522153792592806018`; su
selección no certifica que el cambio esté desplegado ni se declara ACTIVE:

| Uso | Canal | ID |
|---|---|---|
| Parte de las 10 h, consultas y progreso | kpis-reporting | `1533123515023360114` |
| Borradores y confirmaciones de trato | pipeline-deals | `1533123521574862991` |
| Oportunidades de creadores | roster-scouting | `1533123540360892599` |
| Empresas y oportunidades Partners | crm-leads | `1533123519335104754` |

KPI conserva su informe completo, incluidas secciones, nombres, barras,
porcentajes y división de mensajes. No se sustituye por el ejemplo TEST resumido.
Los recibos anteriores permanecen en kpis-reporting: **no se reenvían ni trasladan
lotes históricos** para llenar los canales nuevos. El cambio requiere una
frontera registrada, destino/credenciales comprobados y evidencia nueva del
circuito; no borrar historial, reinicializar el guard ni ampliar permisos.

## Flujo instalado y frontera de transporte

1. El productor consulta el estado de la identidad diaria y hace preflight.
2. Investiga fuentes públicas y cierra un JSON original válido.
3. El wrapper local revisado transmite esos bytes por stdin mediante el SSH
   existente a un dispatcher de comando fijo en el VPS.
4. Dentro de la app canónica, como UID1000, el runtime usa el token únicamente
   en memoria para el endpoint oficial:
   `POST http://127.0.0.1:3000/api/automation/partner-leads`.
5. El CRM crea el lote y actualiza dominios sin pisar owner, notas ni estado
   comercial. Intenta despertar n8n; el sondeo cada dos minutos es el respaldo.
6. El guard conserva el recibo Discord **antes** del ACK al CRM. Ante resultado
   incierto, se consulta la identidad original; no se repite a ciegas.

Ese HTTP de loopback es la **excepción interna autorizada**: la conexión exterior
es SSH autenticado con verificación de host y el bearer nunca sale de la app.
No permite HTTP exterior, redirecciones, copiar tokens al PC, SQL de escritura
ni usar sesión de administrador, webhook Discord o ACK como vía de ingesta.
Los detalles operativos están en [la guía del productor](partner-lead-radar-producer.md).

Los informes vacíos se guardan y notifican una vez si son resultado de una
investigación real. No crear lotes vacíos para simular trabajo o probar diariamente
el transporte. Un archivo local no equivale a un lote en CRM.

## Configuración y entrega

`AUTOMATION_API_TOKEN` protege `/api/automation/*`; no reutilizar
`CRON_SECRET` ni `TARGETS_IMPORT_TOKEN`. La entrega requiere:

```text
N8N_PARTNER_LEADS_WEBHOOK_URL=https://n8n.socialpro.es/webhook/...
DISCORD_PARTNER_LEADS_GUILD_ID=...
DISCORD_PARTNER_LEADS_CHANNEL_ID=...
```

El contrato general permite importar aunque falte configuración Discord y deja
el lote pendiente. El transporte diario es más estricto: exige sus pins, la
app canónica y el destino revisado antes de crear una nueva intención. No usa
KPI como fallback del nuevo canal crm-leads. Tras un cambio de release, actualizar
y verificar los controles es una intervención separada, no tarea del investigador.

El workflow observado es `GNMlX0020uCcWWeD`: webhook autenticado y sondeo sólo
despiertan `infra/n8n/guard/partners.cjs` con `{}`. El JSON legado
`infra/n8n/workflows/socialpro-discord-partner-leads.json` conserva envío directo;
su presencia no autoriza importarlo, ejecutarlo ni reemplazar el circuito activo.
La ejecución diaria no edita workflows, credenciales, guard, políticas o destinos.

## Contrato de importación e idempotencia

La fuente de verdad es `src/lib/schemas/partnerLead.ts`,
`PartnerLeadBatchIntake`: `batchId`, `researchedAt`, `reportSummary` y
`leads`, con identidad/encaje, evidencias fechadas, riesgos y recomendación.
El contrato general admite 20 leads; **el productor diario se limita a 0–8 y
100000 bytes UTF-8**. Rechaza fechas falsas/futuras, URLs con credenciales y
dominios normalizados duplicados, además de la validación del esquema.

Repetir un `batchId` en el endpoint devuelve el resultado anterior sin volver
a modificar leads, pero también intenta despertar n8n y no compara el hash del
contenido duplicado. Por ello el transporte mantiene una barrera durable de un
solo POST; cualquier intento previo obliga a `status`. La entrega única depende
también del guard y del ACK, no sólo de la escritura idempotente del CRM.
