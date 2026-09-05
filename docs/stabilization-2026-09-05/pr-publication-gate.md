# Gate de publicación del PR de estabilización

Fecha: 5 de septiembre de 2026. **Observación histórica de elaboración inicial:** PR preparado para revisión local; sin push, PR remoto ni despliegue acreditados entonces. Este documento no es una consulta del estado remoto actual ni un registro de publicación.

## Actualización de publicación — 5 de septiembre de 2026

El usuario autorizó explícitamente actualizar primero y dejar el trabajo pertinente commiteado y subido a `master`. La referencia remota se actualizó antes de integrar: base `6b967d5a`. Los prototipos y el historial local de auditoría no se fusionan en bloque; se preservan en su rama y se seleccionan los cambios del circuito interno, Creator Discovery, instrucciones aprobadas y sus comprobaciones.

Preflight observado de esta publicación: GitHub devuelve cero webhooks de repositorio y `master` sin protección; el equipo conectado de Vercel devuelve cero proyectos y su plan es Hobby. Los despliegues Vercel más recientes registrados en GitHub son históricos y anteriores a esta base. Esto no se extrapola a cuentas o sistemas inaccesibles.

La configuración versionada bloquea el despliegue Git de `master` y de la rama de estabilización. Además, `scripts/assert-vercel-build-target.cjs` se ejecuta antes de migración/build/IndexNow: rechaza ambas ramas y referencias ausentes o inválidas, sin importar código de aplicación, cargar secretos ni conectar a servicios. Otras ramas identificadas conservan su comportamiento anterior. No protege una ejecución independiente que omita esta configuración.

Los workflows CI/E2E de la integración usan PostgreSQL efímero y valores sintéticos, sin credenciales de correo/autenticación productivas. El push no se usa para ejecutar `sync:press`: se verifica el hook efectivo y se aísla por comando si fuese necesario, conservando las pruebas de ingeniería. No se ejecutan migraciones ni se cambia la imagen del VPS al publicar código.

El resultado concreto del push, SHA y comprobaciones de esta integración se registra en `master-publication-2026-09-05.md`. Las secciones siguientes conservan el análisis histórico, no reabren una aprobación ya concedida.

## Autorizaciones separadas

- La aprobación del 2026-09-05 permite actualizar las instrucciones correspondientes y terminar/activar el circuito interno CRM ↔ n8n ↔ Discord bajo sus gates. No convierte un push, PR remoto, migración, hook de prensa o despliegue en una prueba de conectividad autorizada.
- Una autorización explícita ya dada para publicar el mismo diff/rama/destino no se vuelve a pedir por rutina; se comprueban los gates técnicos pendientes. Solo un nuevo alcance, efecto o permiso de herramienta requiere su decisión adicional.
- Distinguir **histórico**, **autorización vigente**, **preflight técnico** y **resultado observado**. “Falta visibilidad del trigger remoto” no significa “falta autorización del circuito n8n”. Un bloqueo de publicación no bloquea las operaciones internas seguras ya aprobadas.

## Decisión

Conservar descripción y diff en local mientras no estén resueltos el alcance de publicación y sus gates técnicos. No usar un push para descubrir si dispara despliegues. La lectura remota histórica disponible no demostraba qué proyecto/configuración procesaría ese push; hace falta evidencia vigente antes de ejecutarlo, no otra ronda genérica de aprobación de n8n.

La coordinación consultó Vercel en modo lectura: encontró un equipo accesible, su listado de proyectos estaba vacío y la referencia local del proyecto anterior respondió 404. Esto **no demuestra ausencia de otros proyectos, equipos, hooks o integraciones**, ni permite validar un `rootDirectory` vigente. No se han leído ni exportado tokens en esta revisión.

## Riesgos comprobados en el repositorio

| Entrada | Comportamiento observado | Consecuencia para este PR |
|---|---|---|
| `vercel.json` | `tsx scripts/migrate.ts && next build && tsx scripts/ping-indexnow.ts` | No equivale al build local de Next; incluye etapas con posibles efectos externos. |
| `scripts/migrate.ts` | Omite migración si el entorno resuelve a `preview`, salvo `RUN_MIGRATIONS_IN_PREVIEW=true`; carga `.env.local` y puede usar una URL migradora. | No asumir que una ejecución manual o una configuración desconocida tiene esa protección. No ejecutar el script para comprobarlo. |
| `src/lib/deploy-env.ts` | `DEPLOY_ENV` tiene prioridad sobre `VERCEL_ENV`; el valor por defecto es `development`. | La ausencia de ambas variables no bloquea la migración: el script solo omite el caso `preview`. |
| `scripts/ping-indexnow.ts` | Solo envía si el entorno resuelve explícitamente a `production` y se cumplen los demás requisitos de clave/fichero. | No afirmar que todo preview envía, ni que los nombres de entorno desconocidos garantizan aislamiento. |
| `package.json` | `build` es `next build`; `build:with-migrate`, `migrate:deploy` y `postdeploy` son rutas separadas con efectos. | Un build local exitoso no valida la cadena remota de Vercel. |
| `.husky/pre-push` | Invoca `npm run sync:press`; `prepare` instala Husky. | Un push puede ejecutar algo distinto de tests, según la configuración efectiva de hooks. |
| `scripts/sync-press-targets.ts` | Carga `.env.local`, lee el catálogo local y puede insertar/actualizar `press_targets`; los fallos no bloquean el push. | No ejecutarlo ni confiar en un fallo silencioso. No se ha demostrado que esté inactivo en toda copia del proyecto. |
| `.github/workflows/ci.yml` y `e2e.yml` | Las únicas dos workflows versionadas inspeccionadas construyen/prueban con datos efímeros; no contienen un paso de publicación Vercel. | No acredita ausencia de GitHub Apps, hooks o automatizaciones configuradas fuera del repositorio. |

El Dockerfile separa la imagen migradora de la compilación y el runbook del VPS requiere operación explícita. Eso tampoco neutraliza una integración Git distinta de ese flujo.

## Opción de protección exacta de rama — propuesta, no aplicada

Vercel documenta `git.deploymentEnabled` para controlar qué ramas generan despliegues con sus commits. Las ramas no mencionadas mantienen el valor predeterminado `true`. Si varias reglas coinciden y alguna permite desplegar, se despliega: por eso no añadir una regla amplia `"*": true` junto a la exclusión. [Configuración Git oficial](https://vercel.com/docs/project-configuration/git-configuration).

Cambio local mínimo propuesto, preservando las demás claves existentes de `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "stabilize/socialpro-2026-09-05": false
    }
  }
}
```

Este fragmento desactiva la creación automática por Git para **esa rama exacta**, no para `master` ni otras ramas. No es una revocación de permisos de despliegue ni una garantía frente a toda ejecución manual, API, hook o integración independiente. Vercel ofrece varios mecanismos de creación y redespliegue; no deben tratarse como el mismo disparador. [Métodos de despliegue](https://vercel.com/docs/deployments).

La documentación de Deploy Hooks describe un disparador vinculado a proyecto/repositorio/rama, pero su texto de bloqueo menciona la opción heredada `github.enabled=false`; no se extrapola una garantía no comprobada para todos los hooks con la exclusión exacta propuesta. No se recomienda usar esa opción global heredada ni llamar un hook para ensayar. [Deploy Hooks](https://vercel.com/docs/deploy-hooks).

## Defensa adicional posible antes del build — requiere decisión aparte

Si se autoriza preparar un guard adicional, tendría que ser un script pequeño y sin dependencias de aplicación, ejecutado **antes** de importar o invocar migración, Next o IndexNow desde `buildCommand`:

1. Rechazar la rama exacta de estabilización con salida no cero y mensaje fijo, sin valores de entorno.
2. No cargar `.env*`, abrir DB, llamar red ni importar módulos con inicialización externa.
3. Permitir las otras ramas solo cuando su identificación esté presente y sea inequívoca.
4. Rechazar una referencia ausente o inválida en esa entrada del build; no convertir incertidumbre en autorización.
5. No alterar `npm run build`, el migrador del VPS, autenticación ni el comportamiento de la aplicación.

`VERCEL_GIT_COMMIT_REF` es la variable documentada de rama; el acceso a variables de sistema puede estar deshabilitado en el proyecto. Por ello no basta un condicional que simplemente continúe cuando la variable falta. Una ejecución manual sin referencia también tendría que detenerse, aunque pudiera proceder de otra rama: **no se puede prometer a la vez bloqueo ante identidad desconocida y paso libre de todos esos builds**. La política debe aprobarse expresamente. [Variables de sistema](https://vercel.com/docs/environment-variables/system-environment-variables).

La configuración estática leída desde el directorio raíz del proyecto puede sobrescribir el build del dashboard. Es imprescindible comprobar que Vercel consume realmente ese archivo; un proyecto con otra raíz o una integración que use otra configuración queda fuera de la garantía. El guard tampoco evita pasos previos de instalación ni llamadas de una integración que lo omita. [Configuración estática](https://vercel.com/docs/project-configuration/vercel-json), [configuración del build](https://vercel.com/docs/builds/configure-a-build).

No se propone un `ignoreCommand` como única defensa: allí una salida 0 ignora el build y una salida 1 permite continuarlo. Un error ordinario del script no es un bloqueo seguro. Tampoco protegería una entrada que no lo ejecute. [Contrato oficial de ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand).

## Preflight obligatorio antes de cualquier push futuro

- Identificar el repositorio/remoto exactos, rama destino y SHA final; comprobar el diff público sin documentos privados, secretos, saldos ni datos de clientes.
- Resolver todos los proyectos y automatizaciones asociados: integración Git, equipo, raíz efectiva, configuración estática y overrides, ramas de producción y triggers manuales/hook. No exportar URLs secretas de hooks ni valores de credenciales.
- Confirmar las claves de configuración de entorno relevantes mediante metadatos o comprobaciones acotadas, sin volcar secretos. No hacer `env pull` como sustituto de esa revisión.
- Si se aprueba, incluir la exclusión exacta en el mismo commit que se pretende publicar y comprobar que ninguna regla permisiva coincidente la anula. Un PR marcado como borrador no sustituye esta protección.
- Probar cualquier guard adicional con mocks: rama bloqueada, otra rama identificada, referencia ausente/inválida, cero importaciones/operaciones posteriores al rechazo y conservación del orden antes de migración.
- Resolver de forma explícita el hook `sync:press`: conservarlo sin ejecutarlo durante esta fase; no eludirlo silenciosamente ni suponer que borrar una variable evita que cargue `.env.local`.
- Verificar que push/creación del PR estén incluidos en una autorización explícita vigente; conservarla si ya existe para el mismo alcance, sin pedirla de nuevo. Observar después checks y despliegues sin disparar pruebas de efectos. La observación posterior no reemplaza la prevención previa.

## Cierre y reversión

En la elaboración inicial no se había aplicado la protección propuesta. Esta actualización documental no aplica ni revierte ninguna. Consultar el estado efectivo antes de una publicación autorizada. Si falta visibilidad suficiente, informar **publicación bloqueada por ese gate concreto**, sin presentar “PR local preparado” como cumplimiento de una petición de publicar o de dejar operativo el circuito interno.

No cambiar DNS, planes, proyectos, hooks, credenciales o producción para conseguir un enlace de PR. Las guías de despliegue y variables de Vercel se han utilizado para separar revisión, construcción y autorización de publicación, no para ejecutar esas acciones.
