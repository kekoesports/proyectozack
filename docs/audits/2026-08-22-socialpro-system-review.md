# Auditoría integral SocialPro — 2026-08-22

## Resumen ejecutivo

La base funcional existe y está bastante avanzada, pero el sistema no está
todavía en el estado "autónomo y migrado".

- CRM y n8n responden correctamente a sus health checks públicos.
- Zack Agent OS está integrado en `master`; sus seis agentes están sembrados,
  pero todos siguen deshabilitados y no hay worker ni collector vivos.
- El lector de `#pipeline-deals` ha creado borradores reales. El resto de
  workflows n8n necesita compararse con la exportación del servidor antes de
  importar o sobrescribir nada.
- El CRM sigue desplegado en Vercel y usando Neon. La Fase 1 de portabilidad
  está fusionada, pero no se ha hecho el cutover al VPS.
- En el pipeline hay 59 tratos en negociación/aprobada/activa: 44 con Sheet y
  15 sin Sheet. No hay contratos de campaña creados.
- Finanzas tiene interfaz y lógica desarrolladas, pero quedan datos sin
  conciliar; no se puede dar por finalizada operativamente.

## Evidencia comprobada

### Producción

| Comprobación | Resultado |
|---|---|
| `https://socialpro.es/api/health/live` | `live` |
| `https://socialpro.es/api/health/ready` | `ready`; base y migraciones accesibles |
| `https://n8n.socialpro.es/healthz` | `ok` |
| Despliegue CRM | Vercel, estado `READY`, commit `2771d7ca` |
| Base de datos CRM | Neon PostgreSQL 17 |

### Pull requests relevantes

Los PR de Zack Agent OS `#308` a `#313`, el blueprint `#304`, la automatización
de carpetas por creador `#330`, el fix de lectura privada `#331` y la
portabilidad `#303` están fusionados. El handoff que aún dice "seis PR abiertos"
es histórico y no describe el estado actual de GitHub.

Verificación local sobre `origin/master`:

- automatización/Drive/Sheets: 79 tests verdes;
- agentes: 448 tests verdes;
- nuevo bloque de contratos: 95 tests focalizados verdes;
- suite completa: 296 suites y 5.280 tests verdes; 1 test omitido;
- TypeScript, ESLint y `git diff --check`: limpios.

## Flujo correcto de un deal

1. Una persona publica el deal en `#pipeline-deals`.
2. n8n sondea el canal con la identidad del bot y envía mensajes crudos al CRM.
3. El parser determinista del CRM ignora charla y crea un borrador idempotente.
4. Si faltan datos, el borrador queda `missing_info`; no se crea campaña.
5. Una persona corrige y aprueba el borrador.
6. El CRM crea campaña y trackers.
7. El CRM copia la Sheet canónica en la carpeta Drive del creador, la vincula al
   trato y la comparte con su email cuando existe.
8. Si está habilitado, el CRM genera un contrato PDF marcado como `draft`.
9. Una persona revisa contrato, añade firmantes y confirma el envío.
10. El sync periódico lee las Sheets, actualiza progreso y publica avisos
    70/80/100; solo confirma el umbral después de publicar en Discord.

Los pasos 4, 5, 9 y 10 evitan respectivamente datos incompletos, campañas
fantasma, envíos jurídicos accidentales y avisos perdidos.

## Estado de automatizaciones

| Pieza | Estado |
|---|---|
| Lector `#pipeline-deals` cada 15 min | activo y con ejecuciones correctas |
| Parser + borradores CRM | desplegado, determinista e idempotente |
| Aprobación → campaña + trackers | implementado |
| Aprobación → Sheet | implementado; depende de permisos/mapeos Drive |
| Sheet → carpeta del creador + compartir email | implementado; datos de `talent_business` casi vacíos |
| Sincronización de progreso | implementada; el workflow vivo tuvo 19 éxitos y 4 errores en 24 h en la muestra revisada |
| Digest L-X-V 10:30 | implementado; estado vivo por confirmar con exportación |
| Avisos 70/80/100 | implementados; estado vivo por confirmar con exportación |
| Contrato automático `draft` | implementado detrás de kill switch; pendiente de desplegar y validar plantilla |

No se debe importar el JSON versionado sobre n8n hasta comparar la exportación
real. Algunos JSON del repositorio contienen `noOp`, mientras las capturas del
servidor muestran nodos Discord reales.

## Datos operativos pendientes

### Deals, Drive y contratos

| Dato | Valor |
|---|---:|
| Negociación + aprobada + activa | 59 |
| Con Sheet | 44 |
| Sin Sheet | 15 |
| Contratos de campaña | 0 |
| Firmantes | 0 |
| Plantillas de contrato activas | 7 |
| Registros `talent_business` | 1 |
| Con carpeta Drive de creador | 0 |
| Con email de contacto | 0 |

El código de carpeta/compartición está listo, pero sin poblar `talent_business`
seguirá usando la carpeta fallback y no podrá compartir automáticamente.

### Finanzas

| Hallazgo | Pendientes |
|---|---:|
| Gastos sin clasificar | 3 |
| Gastos de campaña sin campaña | 11 |
| Pagos a talentos sin talento | 4 |
| Facturas emitidas cobradas/pagadas sin pago registrado | 20 |
| Movimientos internos liquidados sin pago | 116 |
| Campañas cerradas sin factura | 12 |
| Pagos de factura registrados | 0 |
| Transacciones bancarias importadas | 0 |

La parte de finanzas está desarrollada en código, pero requiere importación y
conciliación de datos antes de considerarse finalizada.

## Zack Agent OS

Arquitectura y control plane están fusionados. Estado vivo:

- seis agentes `disabled`, todos en `shadow`;
- rutinas de Guardian desactivadas;
- cero eventos de agente;
- heartbeats existentes son pruebas antiguas y están `stopped`;
- dos runs de prueba correctos y uno en dead letter;
- un borrador de aprobación pendiente que no debe autoaprobarse.

Secuencia segura de puesta en marcha:

1. instalar collector fijo y sin privilegios en el VPS;
2. desplegar worker con `AGENTS_ENABLED=false`;
3. configurar autenticación interna Bearer + HMAC;
4. configurar proveedor/modelo solo para Guardian;
5. activar únicamente Guardian en `shadow`;
6. validar telemetría, redacción, presupuesto y resultados;
7. habilitar su rutina diaria;
8. añadir agentes posteriores uno a uno, empezando por funciones de solo lectura.

## Acceso autónomo sin contraseñas personales

Los agentes no almacenan contraseñas en memoria ni en tablas de memoria. Cada
integración usa una identidad de máquina persistente con el mínimo permiso.

| Integración | Identidad persistente | Dónde vive el secreto |
|---|---|---|
| Discord | bot de SocialPro | credenciales cifradas de n8n |
| n8n → CRM | `AUTOMATION_API_TOKEN` | secreto n8n + env root-only del CRM |
| Google Drive/Sheets | cuenta de servicio | env/file root-only del CRM |
| CRM → PostgreSQL | rol `socialpro_app` sin DDL | Docker secret/env root-only |
| Migraciones | rol `socialpro_migrator` | solo job de despliegue |
| Guardian collector/worker | token interno + HMAC propios | ficheros 0400/Docker secrets |
| Modelo Guardian | API key dedicada y con presupuesto | solo worker |
| Despliegues GitHub → VPS | usuario SSH de deploy, sin root | secreto de GitHub Actions |

No se entrega al worker la contraseña del administrador del CRM, la cuenta
propietaria de n8n, la contraseña root del VPS, el socket de Docker ni una shell
arbitraria. Los agentes necesitan herramientas acotadas, no una colección de
contraseñas humanas.

## Migración Vercel/Neon → VPS

La portabilidad de código, la imagen Docker, los roles PostgreSQL, los health
checks, los runbooks y la capa de almacenamiento están preparados. Falta:

1. confirmar capacidad ampliada del VPS;
2. desplegar staging con secretos root-only;
3. ejecutar inventario completo de Vercel Blob;
4. construir el índice de fotos/logos sin fila en DB;
5. copiar blobs con checksum, sin borrar origen;
6. restaurar copia de Neon en PostgreSQL del VPS y verificar conteos;
7. probar CRM, OCR/PDF, crons, n8n y contratos end-to-end;
8. hacer cutover DNS/proxy con rollback preparado;
9. observar siete días, probar restauración y exigir cero lecturas fallback;
10. archivar Neon/Vercel solo al cumplir todos los criterios.

El cutover no debe ejecutarse a ciegas mientras contratos, facturas, fotos o
logos sigan dependiendo de rutas directas de Vercel Blob.

## Próximas acciones, en orden

1. Adjuntar y comparar `socialpro-n8n-workflows.json` exportado del servidor.
2. Corregir los cuatro errores históricos del lector/sync y probar un deal de
   muestra sin crear datos finales no revisados.
3. Poblar `talent_business` con carpeta Drive y email de cada creador.
4. Generar las 15 Sheets realmente ausentes tras confirmar los casos.
5. Desplegar el borrador automático de contrato con el kill switch apagado,
   revisar una plantilla y después habilitarlo.
6. Instalar Guardian en shadow con worker apagado primero.
7. Completar staging y ejecutar el runbook de migración al VPS.
8. Conciliar finanzas y cerrar las excepciones de datos.
