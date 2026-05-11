/**
 * Tipos compartidos por los bloques visuales del article page.
 * Cada noticia editorial puede definir un PostBlocks con cualquier
 * combinación de estos campos. Los campos no definidos no rendean nada.
 */

export type MapResult = {
  readonly name: string;
  readonly scoreA: number;
  readonly scoreB: number;
};

export type MatchTeam = {
  readonly name: string;
  readonly logo?: string;
  readonly score: number;
};

export type MatchStatus = 'won' | 'lost' | 'live' | 'upcoming';

export type MatchContext = {
  readonly event: string;
  readonly stage?: string;
  readonly format: 'BO1' | 'BO3' | 'BO5';
  readonly teamA: MatchTeam;
  readonly teamB: MatchTeam;
  readonly maps: ReadonlyArray<MapResult>;
  readonly status: MatchStatus;
};

export type RosterPlayerStatus = 'starter' | 'benched';

export type RosterMember = {
  readonly nick: string;
  readonly country: string;
  readonly realName?: string;
  readonly role?: string;
  readonly status: RosterPlayerStatus;
  readonly talentSlug?: string;
};

export type Roster = {
  readonly teamName: string;
  readonly teamLogo?: string;
  readonly coach?: Pick<RosterMember, 'nick' | 'country' | 'realName' | 'talentSlug'>;
  readonly players: ReadonlyArray<RosterMember>;
};

export type EmbedPlatform = 'x' | 'youtube' | 'hltv';

export type ArticleEmbed = {
  readonly platform: EmbedPlatform;
  readonly url: string;
  readonly title?: string;
  readonly author?: string;
  readonly excerpt?: string;
  readonly publishedAt?: string;
};

export type EditorialQuote = {
  readonly quote: string;
  readonly attribution?: string;
  readonly context?: string;
};

/**
 * Layout slot — instrucción de qué renderizar en cada posición.
 *
 * `kind: 'section'` con `title: null` = lead (paragraphs antes del primer H2).
 * `kind: 'section'` con `title: string` = la sección que empieza con ese H2.
 *
 * Si un post define `layout`, el renderer parte el body por H2 y entremezcla
 * con los bloques visuales según la secuencia. Si no define layout, render
 * fallback: body completo + bloques alrededor.
 */
export type PostLayoutSlot =
  | { readonly kind: 'section'; readonly title: string | null }
  | { readonly kind: 'matchContext' }
  | { readonly kind: 'quote'; readonly index?: number }
  | { readonly kind: 'embed'; readonly index?: number }
  | { readonly kind: 'roster' };

export type PostLayout = ReadonlyArray<PostLayoutSlot>;

export type PostBlocks = {
  readonly matchContext?: MatchContext;
  readonly roster?: Roster;
  readonly quotes?: ReadonlyArray<EditorialQuote>;
  readonly embeds?: ReadonlyArray<ArticleEmbed>;
  readonly layout?: PostLayout;
};
