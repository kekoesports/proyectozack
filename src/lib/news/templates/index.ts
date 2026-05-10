/**
 * Templates editoriales reutilizables para SocialPro News.
 *
 * Cada template es una función pura con types estrictos que produce un
 * BuiltPost completo (slug, title, excerpt, bodyMd, tags, etc.). Reusable
 * desde:
 *   - seeds (DB insert idempotente)
 *   - admin CRUD futuro (formulario consume el mismo input type)
 *   - generación programática (pipeline IA-assist)
 *
 * Garantía: la consistencia editorial está baked en el template — no
 * depende de la disciplina del editor. Si el input cumple el type, el
 * post sale con estructura H2/H3 coherente, tags canónicos y footer
 * de ecosistema.
 */
export type { BuiltPost, TemplateBaseInput } from './types';
export { buildPatchAnalysisPost, type PatchAnalysisInput } from './patchAnalysis';
export {
  buildWeeklyWatchPost,
  type WeeklyWatchInput,
  type WeeklyWatchMatch,
} from './weeklyWatch';
export {
  buildRosterMovesPost,
  type RosterMovesInput,
  type RosterMoveItem,
} from './rosterMoves';
export {
  buildTier2WatchlistPost,
  type Tier2WatchlistInput,
  type Tier2Pick,
} from './tier2Watchlist';
export {
  buildCreatorHighlightPost,
  type CreatorHighlightInput,
} from './creatorHighlight';
