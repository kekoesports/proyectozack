# Plan de cutover

> **Nada de esto se ejecuta sin aprobación explícita.** El documento existe para
> que la decisión se tome con el plan delante, no durante.

## Antes de pedir la aprobación

Sin todo esto en verde, no se pregunta siquiera:

- [ ] VPS ampliado y auditoría de capacidad repetida
- [ ] PR #303 y #306 revisadas y mergeadas
- [ ] Imagen Docker construida y **OCR y PDF ejercitados dentro del contenedor**
- [ ] Staging funcionando contra PostgreSQL del VPS
- [ ] Recuento de filas de staging cuadrado con Neon
- [ ] Checksums de ficheros cuadrados
- [ ] **Restauración real probada** en un proyecto Docker temporal
- [ ] Índice construido para fotos, equipo y logos
- [ ] Decidido qué hacer con el geo por país
- [ ] Capacidad libre medida bajo carga
- [ ] Rollback probado

## Ventana

Estimación: **60–90 minutos** de mantenimiento. Conviene en franja de bajo
tráfico, y **nunca un viernes**: si algo se tuerce, hay que tener días
laborables por delante.

## Orden exacto

Cada paso indica cómo saber que salió bien. Si un paso no verifica, se para.

### Preparación (sin cortar servicio)

| # | Paso | Verificación |
|---|---|---|
| 1 | Backup de Neon | dump con checksum, restaurado en temporal |
| 2 | Inventario final de Blob | recuento coincide con el anterior |
| 3 | Backup del VPS y de n8n | `SHA256SUMS` correcto |
| 4 | Imagen candidata construida y subida | `docker images` muestra el SHA |
| 5 | TTL de DNS bajado a 300 s | **≥ 24 h antes** |

### Corte

| # | Paso | Verificación |
|---|---|---|
| 6 | Activar `MAINTENANCE_MODE=true` en Vercel y redesplegar | HTML y API devuelven 503; `/api/health/*` sigue respondiendo |
| 7 | Activar también mantenimiento en Caddy | el VPS no admite escrituras anticipadas |
| 8 | Esperar el TTL anterior y a que terminen las peticiones | logs sin peticiones activas; Vercel y VPS congelados |
| 8a | Confirmar que los crons de Vercel y las llamadas n8n reciben 503 | ninguna escritura nueva |
| 9 | **Dump final de Neon** | `pg_dump --format=custom`, checksum anotado |
| 10 | Restaurar en PostgreSQL del VPS | `pg_restore --exit-on-error` sin errores |
| 11 | `ANALYZE` | termina |
| 12 | Verificar filas, secuencias, restricciones e índices | cuadran contra el preflight |
| 13 | Copia delta de Blob | 0 en `difiere`, 0 fallos |
| 14 | Migraciones pendientes, **una sola vez** | el guard no aborta; journal al día |

### Arranque

| # | Paso | Verificación |
|---|---|---|
| 15 | Arrancar el candidato | contenedor `healthy` |
| 16 | `/api/health/ready` | 200 con las tres comprobaciones en verde |
| 17 | Pruebas de humo internas | login, una consulta, una descarga privada |
| 18 | **Cambiar el upstream de Caddy** | `caddy reload`, sin cortes |
| 19 | Quitar mantenimiento solo en el VPS | la web responde en el nuevo origen; Vercel permanece congelado |
| 20 | DNS si procede | propagación comprobada |

### Después

| # | Paso |
|---|---|
| 21 | Vigilar errores, memoria, CPU, disco y latencia |
| 22 | Confirmar la primera ejecución de cada cron |
| 23 | Confirmar que n8n sigue intacto |
| 24 | Probar una subida real |
| 25 | Probar un envío de correo |
| 26 | Confirmar que las sesiones abiertas siguen vivas |

## Lo que NO se hace durante el cutover

- No se borra ni modifica nada en Neon
- No se borra nada de Vercel Blob
- No se retira el proyecto de Vercel
- **No se rotan secretos de identidad.** Cambiar `BETTER_AUTH_SECRET` cerraría
  la sesión de todo el mundo en mitad de la migración, y `TOKEN_ENCRYPTION_KEY`
  descifra datos ya guardados: si cambia, se pierden. Su rotación es una ventana
  aparte, después.

## El punto de no retorno

**Es el paso 19**, no el 18.

Mientras la aplicación no acepte escrituras, volver atrás es gratis. En cuanto
entra el primer pedido, Neon queda desactualizado y el retorno deja de ser un
cambio de DNS para convertirse en una recuperación con pérdida de datos.

Conviene anotar **la hora exacta** del paso 19: es la frontera entre "los datos
están en los dos sitios" y "los datos solo están aquí".

> Caddy por sí solo no congela el origen antiguo mientras el DNS todavía apunta
> a Vercel. El paso 6 es obligatorio: evita dos escritores y garantiza que el
> dump final represente el último estado aceptado por producción.

## Si algo falla

| Momento | Qué hacer |
|---|---|
| Antes del 14 | Quitar mantenimiento. No ha pasado nada |
| Entre 14 y 18 | Desactivar `MAINTENANCE_MODE` en Vercel, redesplegar y quitar mantenimiento de Caddy. Neon sigue siendo la fuente |
| Entre 18 y 19 | Reapuntar el upstream de Caddy y recargar |
| **Después del 19** | Ver `08-rollback-plan.md`. Ya no es un cambio de configuración |
