# Discovery Prompt — SocialPro Creator Targets

Detalle de cómo el agente genera queries, extrae handles, filtra candidatos y construye filas. SKILL.md referencia este archivo.

## Contexto del negocio

SocialPro representa creators gaming/esports/iGaming hispanohablantes (España + LATAM). Foco fuerte en **CS2** por la conexión con sites de skins/gambling (clientes: SkinsMonkey, KeyDrop, SkinClub, SkinPlace, CSGOBIG, HellCase, CSGOFast, CSGOSkin — **no** son targets, son partners). El objetivo de la skill es alimentar la pipeline de outreach con creators a firmar.

## Constraints

- **Idioma**: Español únicamente. Doble check: `country` en Firecrawl + post-filter contra `language` y `metadata.language`.
- **Regiones**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO.
- **Plataformas v1**: Twitch, YouTube, Kick.
- **Excluir**: handles propios de SocialPro, partners (skins sites), anglo, granjas SEO.

## Playbook por vertical

### CS2 / FPS hispano

**Anchors**: jugadores pro y casters establecidos sirven como semilla en queries. Ejemplos de identidades reales que aparecen en blogs y rankings:

- Equipos hispanos: `KOI esports`, `Movistar Riders`, `Heretics`, `Case`, `Falcons` (mexicano), `Furious Gaming` (AR), `Leviatán` (LATAM).
- Tournaments / circuits relevantes: `LVP`, `Iberian Cup`, `Esports Iberia`, `Liga Nacional Sub-21`, `Gamers Club Liga`.
- Roles a buscar: pro player, caster/comentarista, analyst, content creator afiliado a equipo, streamer focused on FAceit/competitive.

**Queries semilla** (rotar):
```
"KOI" OR "Movistar Riders" OR "Heretics" CS2 streamer twitch
"caster CS2" español twitch site:twitter.com
"pro player CS2" españa OR argentina
top streamers counter-strike 2 español 2026
"liga nacional" CS2 streamer roster
"creador de contenido" CS2 español YouTube
```

**Filtro de juicio**: descarta variety streamers que tocaron CS2 esporádicamente. Acepta si: bio menciona CS2/Counter-Strike directamente, ≥ 50% de últimas categorías son CS2/CS:GO, o pertenece a roster competitivo.

### iGaming / casino / slots / skins

**Anchors**:
- Slots streamers conocidos en hispano: `Westcol`, `Roberto Cein`, `Fede Vigevani`, `Roberto Ruso`, `Mariano Doval`. (Verificar en Twitch/Kick — algunos están bani-friendly en Kick post-Twitch gambling restrictions.)
- Casino brands hispanas para context: `Codere`, `Codvil`, `Bet365 ES/LATAM`, `Stake.com.mx`, `1xBet ES`.
- Tipo: streamer slots, blog reseñas casino, comparador, afiliado.

**Queries semilla**:
```
"slots" streamer español Kick OR Twitch
"casino online" reseña hispano YouTube
"westcol" OR "roberto cein" OR "fede vigevani" streamer
"apuestas online" creador contenido España
"big win" slots español Kick
"tragamonedas" YouTube hispano canal
```

**Filtro de juicio**: muchos creators hispanos jugaron slots un fin de semana sin ser su contenido principal — descártalos. Acepta si: > 30% de uploads recientes son slots/casino/sportsbook, o canal/profile dedicado.

**OJO regulatorio**: en España, la DGOJ restringe publicidad de iGaming. Algunos streamers grandes evitan etiquetar contenido como "casino" abiertamente — busca también términos colaterales (`tragamonedas`, `bonos`, `apuestas deportivas`).

### Esports (no-CS2)

**Anchors** por juego:
- LoL: `LVP`, `Movistar KOI`, `Saiyans`, `Vodafone Giants`, `Team Heretics`. Casters: `Goncho`, `IbaiLLanos` (cobertura), `Aegis`.
- Valorant: `Heretics`, `Giants`, `KOI Sentinels`, `KRÜ Esports`. Tournaments: `VCT EMEA`, `VCT LATAM`.
- Fortnite: AR/MX scene activa.
- Otros: Smash, Apex, Overwatch — rosters más pequeños pero firmable talent.

**Queries semilla**:
```
"LVP" streamer LoL hispano twitch
"VCT LATAM" valorant pro player twitter
"caster esports" español freelance
"team heretics" OR "movistar riders" content creator
roster 2026 esports hispano twitch
```

**Filtro de juicio**: distinguir pro player activo (puede que no sea contratable como creator) vs caster / content creator. Para SocialPro suele importar más el segundo perfil.

### Gaming generalista (catch-all)

Cuando el usuario no especifica vertical o cuando un creator no encaja claramente en CS2/iGaming/esports pero es relevante (variety streamer hispano grande con audiencia gaming).

**Anchors**:
- Streamers grandes: `IbaiLlanos` (referencia, no firmable), `TheGrefg`, `Auronplay`, `ElRubius`, `Nia` (CL), `Knekro`, `Gemita Gameplay`, `Reborn`. (Estos son de referencia para vibe — los grandes ya tienen agencia.)
- Buscar: tier medio (10k–500k), variety con fuerte porcentaje gaming.

**Queries**:
```
streamer hispano twitch 2026 emergente
"variety streamer" español YouTube 50k OR 100k
gaming content creator argentina mexico crece
twitch.tv discovery español juegos
```

## Generación de queries — reglas

- **Default 3–4 queries.** `--deep` 8–10. No más de 2 queries del mismo vertical/anchor para diversificar.
- **Anchor queries > genéricas**. Lección heredada del press skill (run-01 con queries genéricas trajo 80% ruido). Siempre nombres reales + `OR` + `intitle:`/`site:`.
- Si el usuario pasa texto libre (`/socialpro-creator-targets cs2 españa "westcol style"`) — incorporar el texto en al menos 2 queries.

## Anti-patterns

- **No** queries hacia partners de skins (SkinsMonkey, KeyDrop, etc.) — son clientes.
- **No** sitios anglo (HLTV, Dexerto, Esports Insider, EGR Global, SBC News) — fuera de scope hispano.
- **No** Wikipedia, Reddit, Discord, Steam Community — meta-plataformas.
- **No** granjas SEO ni listas obvias de spam SEO.

`excludeDomains` mínima en cada Firecrawl request:
```
hltv.org, dexerto.com, esportsinsider.com, egr.global, sbcnews.co.uk,
prnewswire.com, openpr.com, prlog.org, pressrelease.com,
wikipedia.org, reddit.com, discord.com, steamcommunity.com, counter-strike.net,
skinsmonkey.com, keydrop.com, skinclub.com, skinplace.com, csgobig.com, hellcase.com, csgofast.com, csgoskin.com
```

## Filtros (en orden, descarte al primer fallo)

### 1. Dedup `(platform, username)` contra DB

Antes de POST, dedup contra `existingUsernames` construido en el paso 2 del workflow. Si platform+username ya existe → skip. (El UPSERT del endpoint también lo maneja, pero esto reduce ruido en audit log).

### 2. Idioma ES — doble check

**Aceptar solo si AMBAS condiciones se cumplen** (lección run-01 del press skill — Firecrawl alucina `language: "es"` para sitios anglo):

(a) `json.language` matchea `/^(es([-_].*)?|spanish|español|castellano)$/i`.
(b) `metadata.language` (proviene de `<html lang>`, más fiable). Empieza por `es`. Si Firecrawl no extrajo (a) pero (b) dice español → aceptar.

Si (a) sí pero (b) dice `en`/`pt`/etc → **descartar** (alucinación).

### 3. Mínimo de followers (post-enrichment)

| Plataforma | Default | Override |
|---|---|---|
| Twitch | 1.000 | `--min-followers-twitch N` |
| YouTube | 3.000 subs | `--min-followers-youtube N` |
| Kick | 500 | `--min-followers-kick N` |

### 4. Activity check (último stream / upload < 60 días)

`--no-activity-check` para skip. Twitch: usar `getCS2LiveStreams` o Helix `/streams` por broadcaster. YouTube: `getChannelDetails` devuelve fecha de último video implícitamente. Kick: `previous_livestreams[0].created_at` del response.

Si no hay datos de actividad disponibles, **acepta con nota** `[actividad-desconocida]` en `discoveredVia` — no descartes ciegamente.

### 5. Vertical match — juicio LLM

No es regex. Lee bio + recent_categories + game_name + recent stream titles + bio del usuario. Decide:

- ¿El creator cubre el vertical solicitado como **foco principal o regular**?
- ¿Bio menciona el vertical?
- ¿% de últimas categorías es del vertical?

Si más del 50% del pool pre-filtrado falla este corte → regenera queries con anchors más estrechos (feedback loop §3 de SKILL.md).

## Schema de fila (ImportItem)

Lo que la skill envía a `POST /api/admin/targets/import`:

```ts
{
  platform: 'twitch' | 'youtube' | 'kick',
  username: string,                // login canónico, max 200
  fullName: string | null,         // display_name, max 300
  profileUrl: string,              // URL de perfil completa (https://...)
  profilePicUrl: string | null,
  followers: number,               // entero >= 0
  following: number | null,
  bio: string | null,              // max 5000
  externalUrl: string | null,      // url del canal o web propia
  discoveredVia: string,           // ej. "firecrawl: streamers CS2 españa twitch" — qué query lo encontró
}
```

Ver [ENDPOINTS.md](ENDPOINTS.md) para la shape completa del request/response.

## batchId convention

```
creator-YYYY-MM-DD-<vertical>-<platform>
```

Vertical: `cs2 | igaming | esports | gaming`.
Platform: `twitch | youtube | kick`.

Ejemplo: `creator-2026-05-02-cs2-twitch`.

Refresh runs: `creator-YYYY-MM-DD-refresh-<platform>` (vertical = `gaming` placeholder; el regex acepta `gaming` como catch-all).

El endpoint enforza este regex en boundary (Zod). Si te equivocas con el formato, recibes 400 antes de cualquier insert.
