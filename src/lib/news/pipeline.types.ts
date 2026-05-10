/**
 * Tipos del pipeline editorial creator → transcript → draft → noticia.
 *
 * NIVEL A+B: documentación + types (sin migration ni servicios todavía).
 * El propósito es definir contratos claros para el día en que tengamos
 * el primer transcript real (Twitch VOD, YouTube auto-caption, etc.).
 *
 * Cuando se implemente la fase real, estos types deben:
 *   - Validarse contra datos reales (no inventar columnas que no usemos).
 *   - Migrar a esquema Drizzle si la persistencia es DB.
 *   - O quedar en memoria/blob si la persistencia es ephemeral.
 *
 * NO se importan desde producción todavía. Existen como contrato para
 * que la siguiente fase del pipeline tenga punto de partida claro.
 *
 * Ver `docs/news-pipeline-creator.md` para el flujo completo.
 */

/** Origen del transcript bruto. */
export type TranscriptSource =
  | { readonly kind: 'twitch_vod'; readonly videoId: string; readonly url: string }
  | { readonly kind: 'youtube'; readonly videoId: string; readonly url: string }
  | { readonly kind: 'kick_clip'; readonly clipId: string; readonly url: string }
  | { readonly kind: 'manual_upload'; readonly filename: string };

export type TranscriptStatus =
  | 'queued'           // recibido, sin procesar
  | 'processing'       // STT corriendo
  | 'ready'            // STT terminado, listo para draft
  | 'failed';          // error de procesamiento

/**
 * Transcript bruto antes de cualquier edición editorial. Almacena
 * resultado de speech-to-text (Whisper o equivalente).
 */
export type CreatorTranscript = {
  readonly id: string;
  readonly creatorTalentSlug: string;     // referencia a /talentos/[slug]
  readonly source: TranscriptSource;
  readonly capturedAt: Date;
  readonly durationSeconds: number;
  readonly language: string;              // 'es', 'en', etc.
  readonly status: TranscriptStatus;
  /** Texto plano segmentado por timestamps. Vacío hasta status='ready'. */
  readonly segments: ReadonlyArray<{
    readonly startMs: number;
    readonly endMs: number;
    readonly text: string;
  }>;
  /** Notas humanas opcionales sobre el transcript (contexto, calidad). */
  readonly notes?: string;
};

export type DraftStatus =
  | 'pending_generation'   // transcript ready, draft no generado aún
  | 'draft_generated'      // IA-assist produjo draft inicial
  | 'human_review'         // editor humano refinando
  | 'ready_to_publish'     // pasa quality gate, listo
  | 'published'            // publicado como post /news
  | 'rejected';            // descartado tras revisión

/**
 * Borrador editorial generado a partir de un transcript. Producto del
 * pipeline IA-assist + revisión humana. Cuando se aprueba, se convierte
 * en un post `vertical='news'` real.
 *
 * El editor revisa, corrige slots [REVISAR] y aprueba antes de
 * promocionar. NUNCA se publica sin pase humano.
 */
export type EditorialDraft = {
  readonly id: string;
  readonly transcriptId: string;
  readonly templateFormat:
    | 'patch_analysis'
    | 'weekly_watch'
    | 'roster_moves'
    | 'tier2_watchlist'
    | 'creator_highlight'
    | 'free_form';        // sin template, edición manual
  readonly status: DraftStatus;
  readonly proposedSlug: string;
  readonly proposedTitle: string;
  readonly proposedExcerpt: string;
  readonly proposedBodyMd: string;
  readonly proposedTags: ReadonlyArray<string>;
  readonly reviewNotes: ReadonlyArray<string>;
  /** Quién está revisando ahora — null si nadie tiene lock. */
  readonly assignedTo: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** Slug del post publicado, si status='published'. */
  readonly publishedPostSlug: string | null;
};

/**
 * Estructura del flujo completo. Cada paso es opcional — algunas
 * noticias serán manuales sin transcript, otras pasarán por todos
 * los pasos.
 */
export type PipelineStage =
  | 'capture'        // VOD/clip recibido
  | 'transcript'     // STT corriendo o terminado
  | 'draft'          // template + IA-assist genera draft
  | 'review'         // humano refina y aprueba
  | 'publish';       // sale como post /news

export type PipelineEvent = {
  readonly id: string;
  readonly stage: PipelineStage;
  readonly transcriptId: string | null;
  readonly draftId: string | null;
  readonly postSlug: string | null;
  readonly actor: 'system' | 'editor';
  readonly actorId: string | null;
  readonly at: Date;
  readonly message: string;
};
