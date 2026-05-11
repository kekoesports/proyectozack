'use client';

import { useState } from 'react';
import type { PostBlocks, MatchContext, EditorialQuote, ArticleEmbed, RosterMember } from '@/features/news/components/article-blocks/types';

// Tipos locales con undefined explícito para evitar conflictos con exactOptionalPropertyTypes
type CoachState = { nick: string; country: string; realName: string | undefined; talentSlug: string | undefined };
type RosterState = { teamName?: string | undefined; teamLogo?: string | undefined; coach?: CoachState | undefined };

type Props = {
  initial?: PostBlocks | null | undefined;
};

const FORMAT_OPTIONS = ['BO1', 'BO3', 'BO5'] as const;
const STATUS_OPTIONS = ['won', 'lost', 'live', 'upcoming'] as const;
const PLATFORM_OPTIONS = ['x', 'youtube', 'hltv'] as const;
const PLAYER_STATUS_OPTIONS = ['starter', 'benched'] as const;

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';
const labelCls = 'block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1';
const sectionCls = 'rounded-xl border border-sp-admin-border/60 overflow-hidden';
const headerCls = 'flex items-center justify-between px-4 py-3 bg-sp-admin-bg/50 cursor-pointer hover:bg-sp-admin-hover transition-colors select-none';

function Section({ title, badge, open, onToggle, children }: {
  title: string; badge?: string | undefined; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={sectionCls}>
      <div className={headerCls} onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-sp-admin-text">{title}</span>
          {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sp-orange/15 text-sp-orange border border-sp-orange/20">{badge}</span>}
        </div>
        <span className="text-sp-admin-muted text-xs">{open ? '▲ ocultar' : '▼ configurar'}</span>
      </div>
      {open && <div className="px-4 py-4 space-y-3 border-t border-sp-admin-border/40">{children}</div>}
    </div>
  );
}

export function BlocksForm({ initial }: Props) {
  // Match block
  const [matchOpen, setMatchOpen] = useState(!!initial?.matchContext);
  const [match, setMatch] = useState<Partial<MatchContext>>(initial?.matchContext ?? {});
  type MapRow = { name: string; scoreA: string; scoreB: string };
  const [maps, setMaps] = useState<MapRow[]>(
    (initial?.matchContext?.maps ?? []).map((m) => ({ name: m.name, scoreA: String(m.scoreA), scoreB: String(m.scoreB) }))
  );

  // Quote block
  const [quoteOpen, setQuoteOpen] = useState(!!(initial?.quotes?.length));
  const [quote, setQuote] = useState<Partial<EditorialQuote>>(initial?.quotes?.[0] ?? {});

  // Embed block
  const [embedOpen, setEmbedOpen] = useState(!!(initial?.embeds?.length));
  const [embed, setEmbed] = useState<Partial<ArticleEmbed>>(initial?.embeds?.[0] ?? {});

  // Roster block
  const [rosterOpen, setRosterOpen] = useState(!!initial?.roster);
  const [roster, setRoster] = useState<RosterState>({
    teamName: initial?.roster?.teamName,
    teamLogo: initial?.roster?.teamLogo,
    coach: initial?.roster?.coach ? { nick: initial.roster.coach.nick, country: initial.roster.coach.country, realName: initial.roster.coach.realName, talentSlug: initial.roster.coach.talentSlug } : undefined,
  });
  const [players, setPlayers] = useState<Partial<RosterMember>[]>(
    (initial?.roster?.players ?? []).map((p) => ({ ...p }))
  );

  function buildBlocksJson(): PostBlocks | null {
    // Construimos como objeto plano — se serializa a JSON; los tipos exactos
    // se validan en el render. El cast final es seguro porque la forma es correcta.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    if (matchOpen && match.event && match.teamA?.name && match.teamB?.name) {
      result.matchContext = {
        event: match.event,
        ...(match.stage ? { stage: match.stage } : {}),
        format: match.format ?? 'BO3',
        status: match.status ?? 'upcoming',
        teamA: { name: match.teamA.name, ...(match.teamA.logo ? { logo: match.teamA.logo } : {}), score: Number(match.teamA.score ?? 0) },
        teamB: { name: match.teamB.name, ...(match.teamB.logo ? { logo: match.teamB.logo } : {}), score: Number(match.teamB.score ?? 0) },
        maps: maps.filter((m) => m.name).map((m) => ({ name: m.name, scoreA: Number(m.scoreA) || 0, scoreB: Number(m.scoreB) || 0 })),
      };
    }

    if (quoteOpen && quote.quote?.trim()) {
      result.quotes = [{ quote: quote.quote, ...(quote.attribution ? { attribution: quote.attribution } : {}), ...(quote.context ? { context: quote.context } : {}) }];
    }

    if (embedOpen && embed.url?.trim()) {
      result.embeds = [{ platform: embed.platform ?? 'x', url: embed.url, ...(embed.title ? { title: embed.title } : {}), ...(embed.author ? { author: embed.author } : {}), ...(embed.excerpt ? { excerpt: embed.excerpt } : {}), ...(embed.publishedAt ? { publishedAt: embed.publishedAt } : {}) }];
    }

    if (rosterOpen && roster.teamName && players.length > 0) {
      result.roster = {
        teamName: roster.teamName,
        ...(roster.teamLogo ? { teamLogo: roster.teamLogo } : {}),
        ...(roster.coach?.nick ? { coach: { nick: roster.coach.nick, country: roster.coach.country ?? '', ...(roster.coach.realName ? { realName: roster.coach.realName } : {}), ...(roster.coach.talentSlug ? { talentSlug: roster.coach.talentSlug } : {}) } } : {}),
        players: players.filter((p) => p.nick).map((p) => ({
          nick: p.nick ?? '',
          country: p.country ?? '',
          ...(p.realName ? { realName: p.realName } : {}),
          ...(p.role ? { role: p.role } : {}),
          status: p.status ?? 'starter',
          ...(p.talentSlug ? { talentSlug: p.talentSlug } : {}),
        })),
      };
    }

    return Object.keys(result).length > 0 ? result as PostBlocks : null;
  }

  const blocksJson = buildBlocksJson();
  const blocksJsonStr = blocksJson ? JSON.stringify(blocksJson) : '';

  return (
    <div className="space-y-3">
      <input type="hidden" name="blocksJson" value={blocksJsonStr} />

      {/* Match Context */}
      <Section title="Contexto de partido" badge={matchOpen && match.event ? match.event : undefined} open={matchOpen} onToggle={() => setMatchOpen(!matchOpen)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Evento *</label>
            <input className={inputCls} placeholder="PGL Astana 2026" value={match.event ?? ''} onChange={(e) => setMatch({ ...match, event: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Fase / Stage</label>
            <input className={inputCls} placeholder="Swiss Round 2" value={match.stage ?? ''} onChange={(e) => setMatch({ ...match, stage: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Formato</label>
            <select className={inputCls} value={match.format ?? 'BO3'} onChange={(e) => setMatch({ ...match, format: e.target.value as typeof FORMAT_OPTIONS[number] })}>
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select className={inputCls} value={match.status ?? 'upcoming'} onChange={(e) => setMatch({ ...match, status: e.target.value as typeof STATUS_OPTIONS[number] })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['teamA', 'teamB'] as const).map((team) => (
            <div key={team} className="space-y-2">
              <p className="text-xs font-bold text-sp-admin-muted uppercase">{team === 'teamA' ? 'Equipo A' : 'Equipo B'}</p>
              <input className={inputCls} placeholder="Nombre *" value={match[team]?.name ?? ''} onChange={(e) => setMatch({ ...match, [team]: { ...match[team], name: e.target.value } })} />
              <input className={inputCls} placeholder="Logo URL" value={match[team]?.logo ?? ''} onChange={(e) => setMatch({ ...match, [team]: { ...match[team], logo: e.target.value } })} />
              <input className={inputCls} type="number" placeholder="Score" min={0} value={match[team]?.score ?? 0} onChange={(e) => setMatch({ ...match, [team]: { ...match[team], score: Number(e.target.value) } })} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Mapas</label>
            <button type="button" onClick={() => setMaps([...maps, { name: '', scoreA: '0', scoreB: '0' }])} className="text-xs text-sp-admin-accent hover:underline">+ Añadir mapa</button>
          </div>
          {maps.map((map, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input className={inputCls} placeholder="Mirage" value={map.name} onChange={(e) => { const m = [...maps]; m[i] = { name: e.target.value, scoreA: m[i]?.scoreA ?? '0', scoreB: m[i]?.scoreB ?? '0' }; setMaps(m); }} />
              <input className={`${inputCls} w-16`} type="number" min={0} placeholder="A" value={map.scoreA} onChange={(e) => { const m = [...maps]; m[i] = { name: m[i]?.name ?? '', scoreA: e.target.value, scoreB: m[i]?.scoreB ?? '0' }; setMaps(m); }} />
              <span className="text-sp-admin-muted">:</span>
              <input className={`${inputCls} w-16`} type="number" min={0} placeholder="B" value={map.scoreB} onChange={(e) => { const m = [...maps]; m[i] = { name: m[i]?.name ?? '', scoreA: m[i]?.scoreA ?? '0', scoreB: e.target.value }; setMaps(m); }} />
              <button type="button" onClick={() => setMaps(maps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          ))}
        </div>
      </Section>

      {/* Quote */}
      <Section title="Cita editorial" badge={quoteOpen && quote.quote ? '✓' : undefined} open={quoteOpen} onToggle={() => setQuoteOpen(!quoteOpen)}>
        <div>
          <label className={labelCls}>Frase *</label>
          <textarea className={inputCls} rows={3} placeholder="&quot;Esta era la victoria que necesitábamos&quot;" value={quote.quote ?? ''} onChange={(e) => setQuote({ ...quote, quote: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Autor / Atribución</label>
            <input className={inputCls} placeholder="alex" value={quote.attribution ?? ''} onChange={(e) => setQuote({ ...quote, attribution: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Contexto</label>
            <input className={inputCls} placeholder="Tras el 2-1 vs MOUZ" value={quote.context ?? ''} onChange={(e) => setQuote({ ...quote, context: e.target.value })} />
          </div>
        </div>
      </Section>

      {/* Embed */}
      <Section title="Embed (X / YouTube / HLTV)" badge={embedOpen && embed.url ? embed.platform : undefined} open={embedOpen} onToggle={() => setEmbedOpen(!embedOpen)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plataforma</label>
            <select className={inputCls} value={embed.platform ?? 'x'} onChange={(e) => setEmbed({ ...embed, platform: e.target.value as typeof PLATFORM_OPTIONS[number] })}>
              {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p === 'x' ? 'X (Twitter)' : p === 'youtube' ? 'YouTube' : 'HLTV'}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>URL *</label>
            <input className={inputCls} type="url" placeholder="https://..." value={embed.url ?? ''} onChange={(e) => setEmbed({ ...embed, url: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Título</label>
            <input className={inputCls} placeholder="Título del contenido" value={embed.title ?? ''} onChange={(e) => setEmbed({ ...embed, title: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Autor</label>
            <input className={inputCls} placeholder="@usuario" value={embed.author ?? ''} onChange={(e) => setEmbed({ ...embed, author: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Descripción / Excerpt</label>
            <textarea className={inputCls} rows={2} placeholder="Resumen del contenido..." value={embed.excerpt ?? ''} onChange={(e) => setEmbed({ ...embed, excerpt: e.target.value })} />
          </div>
        </div>
      </Section>

      {/* Roster */}
      <Section title="Roster de equipo" badge={rosterOpen && roster.teamName ? roster.teamName : undefined} open={rosterOpen} onToggle={() => setRosterOpen(!rosterOpen)}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre del equipo *</label>
            <input className={inputCls} placeholder="Gentle Mates" value={roster.teamName ?? ''} onChange={(e) => setRoster({ ...roster, teamName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Logo URL</label>
            <input className={inputCls} placeholder="https://..." value={roster.teamLogo ?? ''} onChange={(e) => setRoster({ ...roster, teamLogo: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-sp-admin-muted uppercase">Coach (opcional)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input className={inputCls} placeholder="Nick" value={roster.coach?.nick ?? ''} onChange={(e) => setRoster({ ...roster, coach: { ...roster.coach, nick: e.target.value, country: roster.coach?.country ?? '', realName: roster.coach?.realName, talentSlug: roster.coach?.talentSlug } })} />
            <input className={inputCls} placeholder="País (ES, FR...)" value={roster.coach?.country ?? ''} onChange={(e) => setRoster({ ...roster, coach: { ...roster.coach, nick: roster.coach?.nick ?? '', country: e.target.value, realName: roster.coach?.realName, talentSlug: roster.coach?.talentSlug } })} />
            <input className={inputCls} placeholder="Nombre real" value={roster.coach?.realName ?? ''} onChange={(e) => setRoster({ ...roster, coach: { ...roster.coach, nick: roster.coach?.nick ?? '', country: roster.coach?.country ?? '', realName: e.target.value, talentSlug: roster.coach?.talentSlug } })} />
            <input className={inputCls} placeholder="Talent slug" value={roster.coach?.talentSlug ?? ''} onChange={(e) => setRoster({ ...roster, coach: { ...roster.coach, nick: roster.coach?.nick ?? '', country: roster.coach?.country ?? '', realName: roster.coach?.realName, talentSlug: e.target.value } })} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-sp-admin-muted uppercase">Jugadores</p>
            <button type="button" onClick={() => setPlayers([...players, { nick: '', country: '', status: 'starter' }])} className="text-xs text-sp-admin-accent hover:underline">+ Jugador</button>
          </div>
          {players.map((p, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2 items-center">
              <input className={inputCls} placeholder="Nick *" value={p.nick ?? ''} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], nick: e.target.value }; setPlayers(ps); }} />
              <input className={inputCls} placeholder="País" value={p.country ?? ''} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], country: e.target.value }; setPlayers(ps); }} />
              <input className={inputCls} placeholder="Nombre real" value={p.realName ?? ''} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], realName: e.target.value }; setPlayers(ps); }} />
              <input className={inputCls} placeholder="Rol (rifler...)" value={p.role ?? ''} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], role: e.target.value }; setPlayers(ps); }} />
              <select className={inputCls} value={p.status ?? 'starter'} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], status: e.target.value as typeof PLAYER_STATUS_OPTIONS[number] }; setPlayers(ps); }}>
                {PLAYER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-1">
                <input className={inputCls} placeholder="talent-slug" value={p.talentSlug ?? ''} onChange={(e) => { const ps = [...players]; ps[i] = { ...ps[i], talentSlug: e.target.value }; setPlayers(ps); }} />
                <button type="button" onClick={() => setPlayers(players.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
