# Endpoints — SocialPro Creator Targets

Los 5 endpoints internos que la skill consume. Todos viven en el repo de SocialPro y se acceden via `<SOCIALPRO_BASE_URL>` (default `http://localhost:3000`).

## Auth común

Todos requieren header `Authorization: Bearer <TARGETS_IMPORT_TOKEN>`. La skill lo inyecta en cada request.

Posibles respuestas auth:

| Status | Body | Significado |
|---|---|---|
| 401 | `{ ok: false, error: 'unauthorized' }` | Header ausente, malformado o token incorrecto |
| 503 | `{ ok: false, error: 'missing-config' }` | El servidor no tiene `TARGETS_IMPORT_TOKEN` configurado en `env.local` |

Si recibes 503 con `missing-config` o `missing-X-credentials`, **abortar la skill con mensaje claro al usuario**: "Falta credencial X en `env.local` del proyecto. Pide a Reche revisarlo."

## POST /api/admin/discover/twitch/search

Busca canales Twitch + auto-enriquece follower counts en una sola llamada.

**Request body**:

```json
{
  "query": "westcol",
  "limit": 20,
  "liveOnly": false
}
```

- `query` (string, 1–200) — handle, nombre o keyword
- `limit` (number, 1–50, default 20) — máximo de canales devueltos
- `liveOnly` (bool, default false) — filtrar solo canales en directo

**Response 200**:

```json
{
  "ok": true,
  "channels": [
    {
      "broadcasterId": "12345678",
      "login": "westcol",
      "displayName": "WESTCOL",
      "followerCount": 850000,
      "language": "es",
      "currentGame": "Counter-Strike 2",
      "isLive": false,
      "viewerCount": 0,
      "thumbnailUrl": "https://..."
    }
  ]
}
```

**Errores**:
- 400 `{ ok: false, error: 'invalid-body', issues }` — fallo de Zod
- 503 `{ ok: false, error: 'missing-twitch-credentials' }` — `TWITCH_CLIENT_ID`/`SECRET` no configurados

**curl ejemplo**:

```bash
curl -sS -X POST $SOCIALPRO_BASE_URL/api/admin/discover/twitch/search \
  -H "Authorization: Bearer $TARGETS_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"counter-strike español","limit":10}'
```

## POST /api/admin/discover/youtube/search

Busca canales YouTube. Devuelve previews enriquecidos (subscriber counts incluidos por el service).

**Request body**:

```json
{
  "query": "streamer cs2 español",
  "limit": 20,
  "regionCode": "ES"
}
```

- `query` (string) — keyword
- `limit` (number, 1–50, default 20)
- `regionCode` (string, 2 chars, opcional) — `ES`, `MX`, `AR`, `CL`, etc. Sesga el ranking

**Response 200**:

```json
{
  "ok": true,
  "channels": [
    {
      "channelId": "UC_x_...",
      "title": "Westcol",
      "description": "...",
      "subscriberCount": 1200000,
      "videoCount": 350,
      "viewCount": 45000000,
      "thumbnailUrl": "...",
      "country": "CO"
    }
  ]
}
```

**Errores**: 400 invalid-body / 503 `missing-youtube-credentials`.

## POST /api/admin/discover/kick/channel

Lookup directo de un canal Kick por slug. Kick no tiene API de search pública — usa este endpoint para resolver un slug (típicamente extraído de markdown via Firecrawl) a info completa.

**Request body**:

```json
{ "slug": "westcol" }
```

**Response 200**:

```json
{
  "ok": true,
  "channel": {
    "slug": "westcol",
    "username": "westcol",
    "userId": 67890,
    "followers": 850000,
    "bio": "Streamer profesional",
    "country": "Colombia",
    "profilePicUrl": "https://...",
    "bannerUrl": "https://...",
    "recentCategories": ["Counter-Strike 2", "Just Chatting"],
    "isLive": true,
    "lastLivestreamAt": "2026-04-30T10:00:00Z"
  }
}
```

**Errores**:
- 400 invalid-body
- 404 `{ ok: false, error: 'channel-not-found' }` — slug no existe o canal baneado

(No requiere creds de plataforma — Kick API es pública.)

## GET /api/admin/targets/active

Lista paginada de creators activos (status ≠ `descartado`). Para el flow `--refresh`.

**Query params**:

- `platform` (`twitch | youtube | kick`, opcional) — filtrar por plataforma
- `cursor` (number, opcional) — `id` del último item de la página anterior
- `limit` (number, 1–500, default 100)

**Response 200**:

```json
{
  "ok": true,
  "items": [
    { "id": 1, "username": "westcol", "platform": "kick", "followers": 850000, "...": "..." },
    { "id": 2, "username": "...", "...": "..." }
  ],
  "nextCursor": 42
}
```

`nextCursor: null` indica fin de resultados. Iterar hasta que sea `null`.

**curl ejemplo (paginar todo)**:

```bash
cursor=""
while :; do
  resp=$(curl -sS -G "$SOCIALPRO_BASE_URL/api/admin/targets/active" \
    -H "Authorization: Bearer $TARGETS_IMPORT_TOKEN" \
    --data-urlencode "platform=twitch" \
    --data-urlencode "limit=100" \
    ${cursor:+--data-urlencode "cursor=$cursor"})
  # ... procesar items ...
  cursor=$(echo "$resp" | jq -r '.nextCursor // empty')
  [ -z "$cursor" ] && break
done
```

## POST /api/admin/targets/import

Upsert idempotente de creators descubiertos. Conflict policy: actualiza solo campos métricos, respeta workflow.

**Request body**:

```json
{
  "batchId": "creator-2026-05-02-cs2-twitch",
  "items": [
    {
      "platform": "twitch",
      "username": "westcol",
      "fullName": "WESTCOL",
      "profileUrl": "https://www.twitch.tv/westcol",
      "profilePicUrl": "https://...",
      "followers": 850000,
      "following": null,
      "bio": "Streamer profesional",
      "externalUrl": null,
      "discoveredVia": "firecrawl: \"westcol\" CS2 streamer twitch"
    }
  ]
}
```

- `batchId` regex: `^creator-\d{4}-\d{2}-\d{2}-(cs2|igaming|esports|gaming)-(twitch|youtube|kick)$` — enforced server-side. Si te equivocas con el formato, recibes 400.
- `items` array, 1–100. Si tienes más, chunkea.

**Response 200**:

```json
{
  "ok": true,
  "batchId": "creator-2026-05-02-cs2-twitch",
  "received": 12,
  "inserted": 8,
  "updated": 4,
  "ids": [101, 102, 103, ...]
}
```

- `inserted` — filas nuevas
- `updated` — filas que ya existían (UPSERT actualizó followers/bio/etc; status/notes/brandUserId intactos)
- `ids` — IDs de todas las filas afectadas (para auditoría / linking)

**Conflict behavior** (resumen):

| Campo | ON CONFLICT |
|---|---|
| `followers`, `following`, `bio`, `profilePicUrl`, `externalUrl` | Sí, actualizar |
| `fullName`, `discoveredVia`, `importBatchId`, `enrichedAt`, `updatedAt` | Sí, actualizar |
| `status`, `brandUserId`, `notes`, `contactedAt`, `createdAt` | **No, intactos** |

**Errores**:
- 400 `{ ok: false, error: 'invalid-body', issues }` — Zod failure (incluye batchId regex)

## Health-check pre-flight (recomendado)

Antes de empezar discovery, hacer un ping trivial al endpoint que más probablemente falle por env keys. Por ejemplo:

```bash
curl -sS -X POST "$SOCIALPRO_BASE_URL/api/admin/discover/twitch/search" \
  -H "Authorization: Bearer $TARGETS_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"healthcheck","limit":1}'
```

Si devuelve 503 con `missing-twitch-credentials` o `missing-config`, abortar antes de quemar Firecrawl creds.
