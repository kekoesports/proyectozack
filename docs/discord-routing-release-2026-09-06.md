# Discord: publicación y comprobaciones reales del 6 septiembre 2026

Estado observado hasta **11:05 UTC / 13:05 Europe/Madrid**. Este corte sustituye
los bloqueos de publicación de las 02:28 UTC, conservados como historia en
[comprobaciones anteriores](automation-real-checks-2026-09-06.md).

## Publicado, probado y activo

El usuario autorizó expresamente la actualización del VPS existente y el envío
del KPI real al Discord privado. Producción ejecuta `c26c8e1d258cd37bcddf9c950919db424550e058`,
imagen `sha256:5a4e405ce7ec6a698a9f2ff76d6bc2110bd66ab5ac0edd6a1c9fa474e99193fc`.
No se cambiaron DNS, esquema, datos bancarios, credenciales, diseño ni versión de Next.

La ventana `/opt/socialpro/maintenance/routing-release-20260906T105000Z` terminó
en `complete`. Copias privadas en el mismo VPS; sin exportar datos del CRM.
Se conservaron diarios, recibos, exclusiones y corte de histórico. Las ocho familias
n8n recuperaron su estado activo y sus versiones originales. Scheduler arrancado
a las 10:51:32 UTC; worker IA separado continúa parado, no activado indiscriminadamente.

Build limpio con lockfile fflate 0.8.3, npm ci con cero vulnerabilidades reportadas
en ese momento, CI de aplicación `34006983509` con cuatro jobs SUCCESS. PDF/OCR
nativo aislado sin red, usuario 1000 y sin archivos dotenv: PASS. Siete rutas
públicas, login y readiness verificados después de publicar. No equivale a un QA
completo de cada módulo del CRM ni a garantizar seguridad absoluta.

## Cuatro canales privados, sin duplicar canales

| Canal | Función | Guía fijada y leída de vuelta |
|---|---|---|
| kpis-reporting | Informe completo: nombres, marcas, barras, porcentajes, errores, completados, facturación y parados | [Guía](https://discord.com/channels/1522153792592806018/1533123515023360114/1546110658188288081) |
| pipeline-deals | Entrada de tratos, borradores y confirmaciones | [Guía](https://discord.com/channels/1522153792592806018/1533123521574862991/1546110655902384200) |
| roster-scouting | Creadores de YouTube, Twitch y Kick | [Guía](https://discord.com/channels/1522153792592806018/1533123540360892599/1546110660054884472) |
| crm-leads | Empresas y partners CS2 | [Guía](https://discord.com/channels/1522153792592806018/1533123519335104754/1546110661652906045) |

Reporte completo de producción, cinco partes, enviado a las 10:51:48 UTC:
[primer mensaje](https://discord.com/channels/1522153792592806018/1533123515023360114/1546110663372316724).
Identidad `SOCIALPRO_CHANNEL_RESTORE_20260906T105100Z_348a631b`.
Las cuatro guías y las cinco partes se comprobaron mediante GET; replay de la misma
identidad: **cero mensajes adicionales**. No sustituir este informe por un TEST
simplificado. El envío anterior de las 10:35 UTC fue una prueba independiente
prepublicación, también con cinco partes y replay sin duplicados; no reenviarlo.

## Pruebas por sus fronteras reales

| Flujo | Identidad, persistencia y entrega |
|---|---|
| Pipeline | TEST `SOCIALPRO_N8N_E2E_TEST_20260906T105000Z`; n8n 36434, entrada 10:51:12.340 y procesamiento 10:51:15.990 UTC. Borrador CRM 14, sin campaña ni factura. [Mensaje](https://discord.com/channels/1522153792592806018/1533123521574862991/1546110530509348985). Replay conserva borrador y mensaje, duplicate=true. |
| Creadores | TEST `creator-test:routing-c26c8e1d-20260906T105000Z`, outbox 4, sin nueva búsqueda. El horario normal de n8n lo recogió: ejecución 36436, 10:52:00.056 UTC. [Mensaje](https://discord.com/channels/1522153792592806018/1533123540360892599/1546110716786769990); ACK CRM/guard 10:52:00.409. GET exacto y repetición del mismo ACK sin nueva entrega; pendientes=0. |
| Empresas | Lote real `cs2-radar-2026-09-06`, batch 3. Importación aceptada 10:55:06.011 UTC, [mensaje](https://discord.com/channels/1522153792592806018/1533123519335104754/1546111497170591774) .288, ACK CRM .423 y guard .427. GET exacto, autor, canal y hash comprobados a las 10:56:38; sin reimportar. |
| Sin mensajes nuevos | Observaciones naturales pipeline 10:52:32 y KPI 10:51:56: procesados=0, reanudados=0. Los mensajes propios del bot no generan acciones nuevas. |

El lote de empresas contiene **un descarte documentado (BitSkins), cero nuevas
oportunidades positivas**. CRM autenticado comprobado: tres empresas revisables
(SkinBaron, Skinport, CSFloat), cinco registros incluyendo dos descartados.
No confundir cantidad importada con oportunidades válidas ni contactar empresas.

Transporte diario actualizado y verificado en
`/opt/socialpro/maintenance/partner-radar-daily`, conservando el journal.
La automatización existente `radar-diario-cs2-loot-boxes` se actualizó mediante
la herramienta oficial, mismo horario 09:00 Madrid y misma tarea. Necesita PC/Codex
disponibles; **no es un investigador autónomo alojado en el VPS**. El test de entrega
no acredita todavía el próximo disparo diario desatendido.

## Límites e incidencia que siguen abiertos

1. **Sheets:** una única prueba oficial `/api/automation/deals/sync` desde las
   10:59:22.728 hasta 10:59:56.438 UTC: HTTP 200, total 12, sincronizadas 11,
   fallida 1. Lectura posterior: `CURLY x KEYDROP #2` conserva HTTP 503 de Google.
   No se alteró su último éxito ni se inventó progreso. No se repitió el lote.
   Una primera herramienta de comprobación falló localmente por sombrear el
   constructor URL, antes de poder hacer HTTP; se corrigió y probó por stdin
   (7/7), conservando ese intento y una nueva evidencia separada del cliente corregido.
2. **Progreso horario:** ejecución natural n8n 36466 a las 11:00:38 UTC termina
   marcada error porque el guard devuelve 502 para un resultado parcial: 11/12,
   cero alertas/ACK nuevos y ramas sensibles eliminadas. No es una caída de conexión
   ni autoriza reejecutar el slot: su resultado está persistido y el reintento de
   n8n devolvió duplicate=true. Las filas fallidas/antiguas se difieren. El guard
   aún muestra techo de validación `batchMaximum:24`, mientras CRM procesa como
   máximo 12; ese campo no representa cantidad procesada ni cobertura completa.
3. **Discovery de esta mañana (run 11, 06:30 UTC):** YouTube encontró 66, añadió
   11 y actualizó 2; parcial por `page_limit/search_budget_limit`. Twitch encontró
   73, añadió 15 y actualizó 21; parcial por `duplicate_record/page_limit/candidate_limit`.
   Kick encontró 8, añadió 7 y actualizó 1, sin incidencias. No son errores de API
   ni se eliminaron límites para aparentar una búsqueda exhaustiva. CRM autenticado:
   240 leads activos (61 YouTube, 134 Twitch, 39 Kick, 6 Instagram), 65 descartados
   separados. Instagram sigue pausado; permisos adicionales escritos de proveedores
   siguen pendientes de aportar según lo indicado por el usuario.

A las 11:05 UTC las últimas ejecuciones de pipeline, KPI, ACK, creators y partners
son SUCCESS. Resumen diario 08:00 UTC y Search Console 08:15 UTC: SUCCESS; esos
metadatos no sustituyen una verificación completa del contenido de cada informe.
No afirmar «todo al 100%»: el circuito de cuatro canales está publicado y probado;
la hoja 503 y la cobertura parcial arriba descritas siguen visibles.

## Custodia y siguientes comprobaciones

Evidencia privada en el VPS, sin secretos en Git:

- `postrelease-test-20260906T105100Z/verified.json` dentro de maintenance.
- `partner-daily-release-c26c8e1d/installed.json`, con copia previa e intención.
- `sheets-postrelease-c26c8e1d-fixed-client/sheets-sync-once.result.json`.

Conservar identidad/recibos y consultar estado antes de cualquier reintento.
No emitir facturas, enviar emails, recuperar histórico ni resetear registros de
idempotencia para probar. Revisar la próxima lectura programada de la hoja 503;
si persiste, diagnóstico acotado del proveedor sin hacer pública la hoja ni cambiar
credenciales. Este cierre documental no requiere volver a desplegar la imagen.
