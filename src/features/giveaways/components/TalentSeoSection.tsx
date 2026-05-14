import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/utils/constants';

// ── Tipos ────────────────────────────────────────────────────────────────────

type SeoTalent = {
  readonly name: string;
  readonly role: string;
  readonly game: string;
  readonly platform: string;
  readonly bioLong: string | null;
  readonly tags: readonly { tag: string }[];
  readonly socials: readonly { platform: string; followersDisplay: string; profileUrl: string | null }[];
  readonly topGeos: readonly { country: string; pct: number }[] | null;
  readonly audienceLanguage: string | null;
  readonly creatorCountry: string | null;
};

export type TalentFaq = { readonly q: string; readonly a: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Devuelve la URL del hub de juego si existe en el sitio; null si no hay página dedicada. */
export function getGameHubUrl(game: string): string | null {
  const g = game.toUpperCase();
  if (g.includes('CS2') || g.includes('COUNTER-STRIKE')) return '/influencers-cs2';
  if (g.includes('VALORANT')) return '/agencia-influencers-valorant';
  if (g.includes('IGAMING') || g.includes('CASINO') || g.includes('BETTING')) return '/servicios/igaming';
  if (g.includes('ESPORT')) return '/agencia-marketing-esports';
  return null;
}

const PLATFORM_LABELS: Record<string, string> = {
  twitch:    'Twitch',
  youtube:   'YouTube',
  kick:      'Kick',
  instagram: 'Instagram',
  tiktok:    'TikTok',
};

function platformLabel(p: string): string {
  return PLATFORM_LABELS[p.toLowerCase()] ?? p;
}

/** Genera las 3 preguntas del FAQ dinámico para cada talento. */
export function generateTalentFaqs(talent: SeoTalent): TalentFaq[] {
  const mainSocial = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const socialList = talent.socials.map((s) => platformLabel(s.platform)).join(', ') || platformLabel(talent.platform);
  const followers  = mainSocial ? `${mainSocial.followersDisplay} seguidores en ${platformLabel(mainSocial.platform)}` : null;

  return [
    {
      q: `¿Quién es ${talent.name}?`,
      a: `${talent.name} es un ${talent.role.toLowerCase()} especializado en ${talent.game}${followers ? `, con ${followers}` : ''}. Forma parte del roster de SocialPro, agencia gaming especializada en España y LatAm. ${talent.topGeos?.[0] ? `Su audiencia principal está en ${talent.topGeos[0].country} (${talent.topGeos[0].pct}%).` : ''}`.trim(),
    },
    {
      q: `¿Cómo contratar a ${talent.name} para una campaña?`,
      a: `Para colaborar con ${talent.name}, contacta con SocialPro en ${CONTACT_EMAIL} indicando el nombre del creador y el tipo de campaña. SocialPro gestiona la colaboración de principio a fin: briefing, integración de marca, seguimiento de resultados e informe final.`,
    },
    {
      q: `¿En qué plataformas crea contenido ${talent.name}?`,
      a: `${talent.name} está activo en ${socialList}. ${mainSocial?.profileUrl ? `Puedes seguirle en ${platformLabel(mainSocial.platform)}: ${mainSocial.profileUrl}` : ''}`.trim(),
    },
  ];
}

// ── Componente principal ──────────────────────────────────────────────────────

type Props = {
  readonly talent: SeoTalent;
};

/**
 * Sección SEO de una talent page: bio extendida (si existe), métricas de audiencia
 * y FAQ generado por plantilla. Dark theme, coherente con el diseño del perfil.
 * El H1 visual queda en el hero; aquí sólo H2/H3 para no romper la jerarquía.
 *
 * @kind server
 * @feature giveaways
 */
export function TalentSeoSection({ talent }: Props): React.ReactElement {
  const faqs    = generateTalentFaqs(talent);
  const gameHub = getGameHubUrl(talent.game);
  const mainPlatform = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Plataforma principal', value: platformLabel(talent.platform) },
    { label: 'Especialidad',         value: talent.game },
    ...(talent.creatorCountry ? [{ label: 'País del creador', value: talent.creatorCountry === 'ES' ? 'España' : talent.creatorCountry }] : []),
    ...(talent.topGeos && talent.topGeos.length > 0 ? [{ label: 'Mercados top', value: talent.topGeos.slice(0, 3).map((g) => `${g.country} ${g.pct}%`).join(' · ') }] : []),
    ...(mainPlatform?.followersDisplay ? [{ label: `Seguidores ${platformLabel(mainPlatform.platform)}`, value: mainPlatform.followersDisplay }] : []),
    ...(talent.tags.length > 0 ? [{ label: 'Categorías', value: talent.tags.map((t) => t.tag).join(', ') }] : []),
  ];

  return (
    <section
      aria-label={`Información sobre ${talent.name}`}
      className="border-t border-white/[0.06] pt-8 mt-2 space-y-10"
    >

      {/* Bio extendida — solo si existe */}
      {talent.bioLong && talent.bioLong.trim() && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
            Sobre {talent.name}
          </h2>
          <div className="space-y-3">
            {talent.bioLong.trim().split('\n\n').map((p, i) => (
              <p key={i} className="text-sm text-white/55 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Audiencia y contenido */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
          Audiencia y contenido
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-0.5">{s.label}</p>
              <p className="text-[12px] font-semibold text-white/60 leading-tight">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
          Preguntas frecuentes sobre {talent.name}
        </h2>
        <div className="space-y-1.5">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none">
                <span className="text-[13px] font-semibold text-white/70 leading-snug pr-4">{faq.q}</span>
                <span className="text-white/25 shrink-0 group-open:rotate-180 transition-transform duration-200 text-[10px]">▾</span>
              </summary>
              <p className="px-4 pb-4 text-sm text-white/45 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Enlazado interno */}
      <div className="border-t border-white/[0.04] pt-6 flex flex-wrap gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 self-center mr-1">
          Más en SocialPro
        </span>
        {gameHub && (
          <Link
            href={gameHub}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
          >
            {talent.game} →
          </Link>
        )}
        <Link
          href="/talentos"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
        >
          Ver todos los talentos →
        </Link>
        <Link
          href="/contacto"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
        >
          Contactar con SocialPro →
        </Link>
      </div>

    </section>
  );
}
