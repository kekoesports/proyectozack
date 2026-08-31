# Feature · admin/targets

> Descubrimiento y outreach de creadores en YouTube, Twitch, Kick e Instagram.
> Distinto del módulo Campañas (que ya están firmadas).

## Routes

- `/admin/targets` — spreadsheet principal.
- `/api/cron/discover-creator-targets` — descubrimiento diario protegido.

## Componentes

- `TargetsSpreadsheet.tsx` — tabla editable.
- `TargetsSpreadsheet.row.tsx` — identidad visual de cada plataforma, avatar
  con fallback y nombre humano (evita enseñar IDs técnicos de YouTube).
- `CreatorDiscoveryHub.tsx` — buscador multicanal.
- `YouTubeTargetDiscovery.tsx` — búsqueda mundial y puntuación de promesas.
- `TwitchTargetDiscovery.tsx` — búsqueda de canales activos.
- `DirectProfileDiscovery.tsx` — alta exacta de Instagram y Kick.
- `ThSortable.tsx` — th ordenable reutilizable dentro de la feature.
- `targets-constants.ts` — constantes de la feature (no es componente).
- `export-csv.ts` — utilidad de export CSV (no es componente).

## Cualificación automática

- YouTube parte de vídeos publicados recientemente, exige al menos 3 uploads en
  90 días y mediana de 1.000 vistas. El score pondera actualidad, constancia,
  mediana y vistas/suscriptores para detectar canales pequeños eficientes.
- Twitch acepta una señal suficiente por seguidores (250) o audiencia actual
  (20 espectadores) y siempre deja el perfil en revisión.
- Kick usa la Developer Public API oficial cuando existen `KICK_CLIENT_ID` y
  `KICK_CLIENT_SECRET`; la consulta exacta por slug sigue disponible.
- Instagram permanece manual hasta conectar una cuenta profesional de Meta; no
  se hace scraping de perfiles.

## Server vs Client

- **Client**: spreadsheet y buscadores interactivos.
- **Server**: acciones, servicios de plataforma, cron y persistencia.

## Dependencias clave

- `@/lib/queries/targets`.
- `@/lib/services/youtube`.
- `@/lib/services/twitch`.
- `@/lib/services/kick`.
