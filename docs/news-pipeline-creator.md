# Pipeline editorial Creator → Transcript → Draft → Noticia

Documento de **arquitectura preparada** para el flujo de generación
asistida de news a partir de contenido de creators (Twitch VODs,
YouTube videos, Kick clips). **No implementado todavía** — solo
contratos claros para cuando lleguen los primeros casos reales.

Estado actual: **Nivel A+B** (doc + types TS). Sin migration ni servicios.

## Por qué este pipeline

SocialPro tiene roster de creators activos publicando contenido
diariamente. Mucho de ese contenido tiene valor editorial (análisis
post-partido, lecturas competitivas, opiniones sobre roster moves)
que hoy se pierde — no se transcribe, no se reformatea, no llega al
hub de news.

El pipeline propuesto:

```
[creator publica VOD/clip]
       ↓
[capture] — sistema captura URL/archivo
       ↓
[transcript] — STT (Whisper o similar) genera segmentos
       ↓
[draft] — template + IA-assist produce borrador editorial
       ↓
[review] — editor humano refina, valida datos, marca [REVISAR]
       ↓
[publish] — se convierte en post /news con vertical='news'
```

**Importante**: ningún paso publica automáticamente. La revisión humana
es siempre obligatoria antes de promocionar.

## Stages

### 1. Capture
Trigger manual (editor pega URL del VOD) o automático (webhook de
Twitch/YouTube cuando un creator del roster sube contenido nuevo).
Persiste `CreatorTranscript` con `status='queued'`.

### 2. Transcript
Worker de fondo procesa el VOD con STT. Actualiza
`status='processing'` → `'ready'` cuando termina, o `'failed'` si error.
Output: `segments[]` con `startMs`, `endMs`, `text`.

Servicio sugerido: **Whisper API** (OpenAI) o **Deepgram**. Para VODs
largos (>2h) considerar Whisper local con chunking.

### 3. Draft
Cuando un transcript está `ready`, el editor (o un trigger automático)
elige un template editorial:
- `patch_analysis` — si el creator habla de un patch reciente
- `roster_moves` — si comenta movimientos
- `weekly_watch` — para previews semanales
- `tier2_watchlist` — para análisis de equipos
- `creator_highlight` — para perfilar al propio creator
- `free_form` — sin template, edición manual desde transcript

El servicio IA-assist toma `transcript.segments` + `templateFormat` y
produce un `EditorialDraft` con slots rellenados (slug propuesto,
título, body markdown, tags). Marcado con `[REVISAR]` los datos
sensibles que no puede verificar (nombres, fechas exactas, stats).

Modelo recomendado: **Claude Sonnet/Haiku** o **GPT-4o** con prompt
constraint estricto (solo extracción del transcript, no inventar).

### 4. Review
El draft entra en `status='human_review'`. Editor humano:
1. Verifica datos contra fuentes (HLTV, Liquipedia, Blogabet)
2. Refina copy si hace falta
3. Resuelve slots [REVISAR]
4. Aprueba (`status='ready_to_publish'`) o descarta (`'rejected'`)

El editor puede usar templates manualmente sin pasar por IA-assist
si prefiere — el flujo es opcional, no obligatorio.

### 5. Publish
Cuando un draft está `ready_to_publish`, un click promociona a post
real: insert en `posts` con `vertical='news'`, `status='published'`,
copia campos de `proposedSlug`, `proposedTitle`, `proposedBodyMd`,
`proposedTags`. Draft pasa a `status='published'` con
`publishedPostSlug` resuelto.

## Modelo de datos (futuro)

Ver `src/lib/news/pipeline.types.ts` para los tipos TS preparados.
Cuando implementemos:

- `creator_transcripts` table — `CreatorTranscript`
- `editorial_drafts` table — `EditorialDraft`
- `pipeline_events` table — `PipelineEvent` (audit log)

Los enums (`TranscriptStatus`, `DraftStatus`, `PipelineStage`,
`templateFormat`) se promueven a `pgEnum` en migration.

## Quality gates antes de implementar

1. **Tener al menos 5 transcripts reales** para validar el flujo end-
   to-end manualmente antes de automatizar.
2. **Validar templates funcionan con datos de transcripts reales** —
   muchos posts seed actuales usaron mi conocimiento; los templates
   deben aguantar variabilidad real.
3. **Decidir storage**: DB para transcripts cortos, Vercel Blob para
   audios/VODs originales si los almacenamos.
4. **Decidir IA proveedor** y coste por draft estimado.
5. **Revisar legalidad**: copyright sobre VODs públicos antes de
   procesarlos sistemáticamente.

## Decisiones diferidas

- **Trigger automático vs manual**: ahora vamos manual (editor pega
  URL). Automatización viene cuando el flujo manual valide el ROI.
- **Multi-creator vs single**: empezar con un creator (ArkeroZ) para
  iterar; ampliar al roster cuando esté pulido.
- **Compliance DGOJ**: si algún transcript trata iGaming, validar
  que el output cumple la regulación antes de publicar.

## Cuándo implementar

Cuando se cumplan dos condiciones:
1. Volumen editorial actual (manual + templates) deja de ser
   suficiente para la cadence deseada.
2. Hay al menos un caso real probado manualmente que justifique
   la automatización.

Mientras tanto, esta arquitectura queda como compromiso: cuando
toque construir, no empezamos de cero.
