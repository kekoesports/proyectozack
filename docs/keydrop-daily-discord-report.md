# Informe diario de sorteos KeyDrop

**Ámbito:** perfiles públicos `/talentos/[slug]`, `/sorteos/[creatorSlug]` y Discord.

## Comportamiento

- Los perfiles públicos reutilizan `getExternalGiveawaysForCreator`: no hay una
  segunda integración ni datos duplicados. La respuesta de KeyDrop se valida con
  Zod y mantiene el cache de 60 segundos del provider.
- Solo se pintan sorteos activos cuando la API responde correctamente.
- Cada card muestra `participantCount`. Si el sorteo exige depósito, la etiqueta
  visible es “depositantes”; el total superior dice “participaciones acumuladas”
  porque KeyDrop no permite deduplicar una misma persona entre varios sorteos.
- El cron `GET /api/cron/keydrop-daily-report` consulta en paralelo todos los
  bindings KeyDrop y publica el detalle por sorteo en Discord.

## Horario

`15 7 * * *` UTC, todos los días. Equivale a las 09:15 en Madrid durante el
horario de verano y las 08:15 durante el de invierno.

Está registrado tanto en `vercel.json` como en
`infra/crm/scheduler/crontab`. Solo uno de los dos schedulers debe estar activo
en producción, según `docs/migration/06-cron-migration.md`.

## Variables de entorno

- `KEYDROP_<CREATOR>_API_KEY`: una clave por talento. Para ERUBY se usa
  `KEYDROP_ERUBY_API_KEY`.
- `KEYDROP_DAILY_DISCORD_WEBHOOK_URL`: Incoming Webhook del canal de Discord que
  recibirá el informe.
- `CRON_SECRET`: Bearer compartido por el scheduler y el route handler.

Las tres son server-only. Nunca deben imprimirse en logs, commits ni respuestas.

## Límites del dato

La API entrega `participantCount`, no identidades ni depósitos por usuario. Por
eso el informe puede mostrar el contador de cada sorteo, pero no rankings,
usuarios únicos ni dinero depositado. Ver `docs/keydrop-api-capabilities.md`.
