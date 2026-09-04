import Image from 'next/image';
import Link from 'next/link';
import { PartnerExternalNotice } from '@/components/partner/PartnerExternalNotice';
import { getProvider } from '@/lib/external-giveaways/providers';
import { formatCurrency } from '@/lib/external-giveaways/providers/keydrop/mapper';
import type { ExternalGiveawayCard, ExternalGiveawaySections } from '@/lib/external-giveaways/types';
import type { GiveawayWithTalent } from '@/types';
import { GiveawayFeatured } from './GiveawayFeatured';
import { GiveawayRow } from './GiveawayRow';

interface Props {
  readonly talentName: string;
  readonly talentSlug: string;
  readonly hasCodes: boolean;
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
  readonly externalSections: ExternalGiveawaySections;
}

/** Reutiliza en el perfil la fuente validada de `/sorteos/[creatorSlug]`. */
export function TalentGiveawaysContent({
  talentName,
  talentSlug,
  hasCodes,
  active,
  finished,
  externalSections,
}: Props): React.JSX.Element {
  const provider = externalSections.providerKey ? getProvider(externalSections.providerKey) : null;
  const externalActive = externalSections.status === 'ok' ? externalSections.active : [];
  const hasActive = active.length > 0 || externalActive.length > 0;
  const featuredGiveaway = active[0] ?? null;
  const restGiveaways = active.slice(1);

  return (
    <>
      {hasActive ? (
        <div id="sorteos" className="space-y-8">
          {active.length > 0 ? (
            <section className="space-y-3" aria-labelledby="sorteos-heading">
              <ProfileGiveawaysHeading count={active.length} href={`/sorteos?creator=${talentSlug}`} />
              {featuredGiveaway ? <GiveawayFeatured giveaway={featuredGiveaway} /> : null}
              {restGiveaways.length > 0 ? (
                <div className="space-y-2">
                  {restGiveaways.map((giveaway) => <GiveawayRow key={giveaway.id} giveaway={giveaway} />)}
                </div>
              ) : null}
            </section>
          ) : null}

          {provider && externalActive.length > 0 ? (
            <section className="space-y-3" aria-labelledby="keydrop-sorteos-heading">
              <PartnerExternalNotice partner={provider.displayName} category="casino_like" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="keydrop-sorteos-heading" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                      Sorteos {provider.displayName} de {talentName}
                    </h2>
                    <span className="flex items-center gap-1 text-[9px] font-black text-[#C3FC00]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                      {externalActive.length} live
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/30">
                    {sumParticipants(externalActive).toLocaleString('es-ES')} participaciones acumuladas en sorteos activos · no son usuarios únicos
                  </p>
                </div>
                <Link href={`/sorteos/${talentSlug}`} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/35 transition-colors hover:text-sp-orange">
                  Ver plataforma completa <span aria-hidden>→</span>
                </Link>
              </div>
              <div className={externalActive.length > 1 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
                {externalActive.map((giveaway) => (
                  <TalentExternalGiveawayCard key={giveaway.id} giveaway={giveaway} providerName={provider.displayName} providerLogo={provider.logoAsset} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!hasCodes && !hasActive && finished.length === 0 ? <EmptyState talentName={talentName} /> : null}

      {finished.length > 0 ? (
        <details className="lg:hidden group border-t border-white/[0.06] pt-6">
          <summary className="cursor-pointer list-none flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Finalizados · {finished.length}</p>
            <span className="text-[10px] font-bold text-white/20 group-open:hidden">Mostrar ▸</span>
            <span className="text-[10px] font-bold text-white/20 hidden group-open:inline">Ocultar ▴</span>
          </summary>
          <div className="space-y-2">
            {finished.map((giveaway) => <GiveawayRow key={giveaway.id} giveaway={giveaway} finished />)}
          </div>
        </details>
      ) : null}
    </>
  );
}

function ProfileGiveawaysHeading({ count, href }: { readonly count: number; readonly href: string }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <div className="flex items-center gap-2">
        <h2 id="sorteos-heading" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Sorteos activos</h2>
        <span className="flex items-center gap-1 text-[9px] font-black text-[#C3FC00]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
          {count} live
        </span>
      </div>
      <Link href={href} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/35 hover:text-sp-orange transition-colors">
        Ver todos en sorteos <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function TalentExternalGiveawayCard({ giveaway, providerName, providerLogo }: { readonly giveaway: ExternalGiveawayCard; readonly providerName: string; readonly providerLogo: string }) {
  const participantLabel = giveaway.depositRequired > 0 ? 'depositantes' : 'participantes';

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition-colors hover:border-white/[0.16]">
      <div className="flex min-h-32">
        <div className="relative w-32 shrink-0 bg-black/30 sm:w-40">
          {giveaway.imageUrl ? <Image src={giveaway.imageUrl} alt={giveaway.imageAlt} fill sizes="160px" className="object-contain p-3" unoptimized /> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Image
              src={providerLogo}
              alt={providerName}
              width={64}
              height={18}
              className="max-h-[18px] object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
            <span className="rounded-full border border-[#C3FC00]/20 bg-[#C3FC00]/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#C3FC00]">En curso</span>
          </div>
          <h3 className="line-clamp-2 text-sm font-black text-white/85">{giveaway.title}</h3>
          <p className="mt-1 text-[11px] font-bold text-white/40">{formatCurrency(giveaway.totalValue, giveaway.currency)} en premios</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
            <div>
              <p className="text-xl font-black tabular-nums text-white">{giveaway.participantCount.toLocaleString('es-ES')}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">{participantLabel}</p>
            </div>
            <a href={giveaway.externalUrl} target="_blank" rel="noopener noreferrer sponsored" className="rounded-full bg-sp-grad px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white transition-transform group-hover:scale-[1.02]">
              Ver sorteo →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ talentName }: { readonly talentName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      </div>
      <p className="text-sm font-bold text-white/30 uppercase tracking-wider">Próximamente</p>
      <p className="text-xs text-white/20 mt-1">No hay códigos ni sorteos activos de momento</p>
      <a href={`/contacto?type=brand&talent=${encodeURIComponent(talentName)}`} className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all">
        Contactar para colaborar →
      </a>
    </div>
  );
}

function sumParticipants(giveaways: readonly ExternalGiveawayCard[]): number {
  return giveaways.reduce((total, giveaway) => total + giveaway.participantCount, 0);
}
