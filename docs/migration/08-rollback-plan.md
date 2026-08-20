# Plan de vuelta atrás

## La idea que gobierna todo el documento

**Volver a Neon no es un rollback: es una recuperación.**

En cuanto la aplicación acepta la primera escritura en el VPS, Neon queda
desactualizado. A partir de ahí, apuntar de nuevo a Neon no restaura el estado
anterior — **pierde todo lo escrito desde el cutover** y lo hace en silencio,
porque la aplicación arrancaría tan campante contra unos datos viejos.

Por eso el rollback normal es otro:

> **Se conserva PostgreSQL del VPS y se vuelve a la imagen anterior de la
> aplicación.**

Eso cubre lo que falla de verdad en la práctica: un error en el código nuevo.

## Rollback de aplicación — el habitual

Azul/verde. La versión anterior sigue levantada durante la observación, así que
volver es reapuntar y recargar:

```bash
# El upstream es una variable del Caddyfile
CRM_UPSTREAM=app-anterior:3000 caddy reload --config /etc/caddy/Caddyfile
```

Segundos, sin reconstruir nada, sin tocar la base.

**No se reconstruye la imagen en ese momento.** Reconstruir bajo presión, con
el servicio caído y sin saber aún qué falló, es cómo un incidente de cinco
minutos se convierte en uno de dos horas.

## Rollback de datos — la parte incómoda

### Si aún no ha habido escrituras

Quitar mantenimiento y dejar que Vercel siga sirviendo contra Neon. No ha
pasado nada.

### Si ya ha habido escrituras

No hay marcha atrás limpia. Hay que elegir:

**Opción 1 — quedarse en el VPS y arreglar hacia delante.** Casi siempre es lo
correcto. Los datos están completos; el problema es otra cosa.

**Opción 2 — volver a Neon aceptando la pérdida.** Solo si el VPS es
inviable. Implica:

1. Parar la aplicación (que no entren más escrituras)
2. Volcar PostgreSQL del VPS **ahora**, para no perder lo que haya
3. Decidir qué hacer con lo escrito entre el cutover y este momento
4. Restaurar en Neon o en otra instancia
5. Reapuntar la aplicación

El paso 3 no tiene solución automática: hay que mirar qué se creó en esa
ventana y decidir a mano. Por eso la hora exacta del cutover se anota.

## Qué hace falta tener preparado antes

- [ ] Imagen anterior aún presente en el host (no borrada tras el despliegue)
- [ ] Volcado del PostgreSQL del VPS inmediatamente posterior al cutover
- [ ] Procedimiento probado para restaurar ese volcado en Neon
- [ ] Hora exacta del cutover anotada
- [ ] Neon **intacto**, sin escrituras nuevas
- [ ] Vercel Blob **intacto**
- [ ] Proyecto de Vercel sin retirar

Esa lista es la razón de que las restricciones del encargo prohíban apagar Neon
o Vercel hasta terminar la observación. No es prudencia excesiva: es lo único
que hace posible el punto anterior.

## Rollback de infraestructura

| Qué falla | Qué hacer |
|---|---|
| Caddy no arranca con la configuración nueva | `caddy validate` antes de recargar; volver al Caddyfile anterior |
| Se rompe el acceso a n8n | Desconectar la red `socialpro_edge` del Caddy; su bloque no se ha tocado |
| PostgreSQL del CRM no arranca | Revisar el volumen. **Nunca** borrarlo para "empezar limpio" |
| El VPS se queda sin memoria | Parar el CRM. n8n vuelve solo |
| Se pierde el acceso SSH | Consola del panel de netcup |

## Lo que nunca se hace al volver atrás

- **No se borra el volumen de PostgreSQL.** Es la copia más reciente de los
  datos, aunque esté en un estado raro.
- **No se fuerza el checkout ni se descartan cambios** sin haberlos volcado.
- **No se rotan secretos** durante un incidente: multiplica las variables.
- **No se reconstruyen imágenes** con el servicio caído.
