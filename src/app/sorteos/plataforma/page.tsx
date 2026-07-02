import { headers } from 'next/headers';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dailyStreaks, talents } from '@/db/schema';
import {
  getActiveShopItems,
  getCoinBalance,
  getGiveawaysWithEntryData,
  getMissionsWithProgress,
  getMonthlyRanking,
} from '@/lib/queries/giveawayPlatform';
import {
  PLATFORM_CREATOR_SLUGS,
  ENTRY_COIN_REWARD,
  todayInPlatformTz,
} from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { PlatformNav } from '@/features/giveaway-platform/components/PlatformNav';
import { PlatformHero } from '@/features/giveaway-platform/components/PlatformHero';
import { BrandBonusesSection } from '@/features/giveaway-platform/components/BrandBonusesSection';
import { DailyStreakCard } from '@/features/giveaway-platform/components/DailyStreakCard';
import { MissionsGrid } from '@/features/giveaway-platform/components/MissionsGrid';
import { EntryButton } from '@/features/giveaway-platform/components/EntryButton';
import { PlatformShop } from '@/features/giveaway-platform/components/PlatformShop';
import { MonthlyRanking } from '@/features/giveaway-platform/components/MonthlyRanking';
import { ExternalGiveawaysSection } from '@/features/giveaway-platform/components/ExternalGiveawaysSection';
import { getExternalGiveawaysForCreator } from '@/lib/queries/externalGiveaways';
import { isExternalCreator } from '@/lib/external-giveaways/creator-bindings';
import type { ExternalGiveawaySections } from '@/lib/external-giveaways/types';

/**
 * PR1 (v2 shell): nav sticky + hero Bonuses + tarjetas estáticas de marcas.
 * Los bloques dinámicos (racha, misiones, sorteos, ranking, tienda) siguen
 * usando los componentes previos envueltos en `.gp-legacy-block` — PR2 los
 * rediseñará con detalle. Backend intacto.
 */
export default async function PlataformaSorteosPage({
  searchParams,
}: {
  searchParams: Promise<{ creador?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;

  const dbCreators = await db.query.talents.findMany({
    where: inArray(talents.slug, [...PLATFORM_CREATOR_SLUGS]),
  });
  const { creador } = await searchParams;
  const active = dbCreators.find((c) => c.slug === creador) ?? dbCreators[0];

  const creatorOptions = dbCreators.map((c) => {
    const visual = getCreatorVisual(c.slug);
    return {
      slug: c.slug,
      name: c.name,
      emoji: visual.emoji,
      color: visual.color,
      sub: visual.sub,
      photoUrl: c.photoUrl,
    };
  });

  if (!active) {
    return (
      <>
        <PlatformNav
          creators={creatorOptions}
          activeSlug=""
          userName={userName}
          balance={0}
          loggedIn={Boolean(userId)}
        />
        <main className="gp-wrap">
          <section style={{ padding: '80px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)' }}>
              No hay creadores configurados en la plataforma todavía.
            </p>
          </section>
        </main>
      </>
    );
  }

  const activeVisual = getCreatorVisual(active.slug);
  // Regla: 1 creador = 1 fuente. Si el creador tiene binding externo
  // (external-giveaways/creator-bindings.ts), sus sorteos vienen del
  // provider externo — la <section id="sorteos"> del CRM interno se oculta.
  // Si no tiene binding, usa sorteos internos del CRM como hasta ahora.
  const isExternal = isExternalCreator(active.slug);
  const giveawaysData = isExternal
    ? []
    : await getGiveawaysWithEntryData(active.id, userId);

  const [balance, missions, streak] = userId
    ? await Promise.all([
        getCoinBalance(userId),
        getMissionsWithProgress(userId),
        db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
      ])
    : [0, [], undefined];

  const [ranking, shopItemsData, externalSections] = await Promise.all([
    getMonthlyRanking(10),
    getActiveShopItems(),
    // Sorteos externos: se dispara SOLO si el creador tiene binding externo.
    // Degrada a listas vacías si falta env, provider cae o shape falla —
    // nunca lanza. La UI hace return null cuando status !== 'ok'.
    isExternal
      ? getExternalGiveawaysForCreator(active.slug)
      : Promise.resolve<ExternalGiveawaySections>({ active: [], finished: [], providerKey: null, status: 'no_binding' }),
  ]);

  const today = todayInPlatformTz();
  const claimedToday = streak?.lastClaimDate === today;

  return (
    <>
      <PlatformNav
        creators={creatorOptions}
        activeSlug={active.slug}
        userName={userName}
        balance={balance}
        loggedIn={Boolean(userId)}
      />

      <main className="gp-wrap">
        <PlatformHero code={activeVisual.code} creatorName={active.name} />

        {/* --- Impacto visual: partners justo después del hero --- */}
        <BrandBonusesSection creatorCode={activeVisual.code} />

        {/* --- Bloques funcionales debajo --- */}
        {userId ? (
          <>
            <section id="racha">
              <div className="gp-legacy-block">
                <h2>Recompensa diaria</h2>
                <DailyStreakCard currentDay={streak?.currentDay ?? 1} claimedToday={claimedToday} />
              </div>
            </section>

            <section id="misiones">
              <div className="gp-legacy-block">
                <h2>Misiones · gana monedas</h2>
                <MissionsGrid missions={missions} />
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="gp-legacy-block" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                Inicia sesión con Steam para participar en los sorteos, completar misiones y ganar monedas.
              </p>
            </div>
          </section>
        )}

        {/* Sección de sorteos internos del CRM (NAOW/HUASOPEEK/MARTINEZ). */}
        {/* Para creadores con binding externo (p.ej. ZACKETIZOR → KeyDrop) */}
        {/* se oculta y solo aparece <ExternalGiveawaysSection> abajo.       */}
        {isExternal ? null : (
          <section id="sorteos">
            <div className="gp-legacy-block">
              <h2>Sorteos de {active.name}</h2>
              <p className="gp-rank-note">
                Participación gratuita · ganas +{ENTRY_COIN_REWARD} 🪙 por sorteo · fotos reales de las skins
              </p>
              <div className="gp-sorteos-grid">
                {giveawaysData.map((g) => (
                  <article key={g.id} className="gp-sorteo-card">
                    <div className="gp-sorteo-glow" aria-hidden />
                    <div className="gp-sorteo-fg">
                      <div className="gp-sorteo-img">
                        {g.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.imageUrl} alt={g.title} />
                        ) : (
                          <div className="gp-sorteo-img-empty">📷 Foto de la skin</div>
                        )}
                      </div>
                      <h3 className="gp-sorteo-title">★ {g.title}</h3>
                      {g.value ? <div className="gp-sorteo-value">{g.value}</div> : null}
                      <div className="gp-sorteo-meta">
                        👥 <b>{g.entryCount.toLocaleString('es-ES')}</b> participantes
                      </div>
                      <div className="gp-sorteo-reward">
                        Gratis · +{ENTRY_COIN_REWARD} 🪙
                      </div>
                      <div className="gp-sorteo-cta">
                        {userId ? (
                          <EntryButton giveawayId={g.id} initialEntered={g.userHasEntered} />
                        ) : (
                          <span className="gp-sorteo-locked">Inicia sesión para participar</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* --- Sorteos externos (KeyDrop, CSGORoll, etc.) — solo lectura --- */}
        <ExternalGiveawaysSection sections={externalSections} creatorDisplayName={active.name} />

        <section id="ranking">
          <div className="gp-legacy-block">
            <h2>Ranking mensual</h2>
            <MonthlyRanking rows={ranking} />
          </div>
        </section>

        <section id="tienda">
          <div className="gp-legacy-block">
            <h2>Tienda · canjea tus monedas</h2>
            <PlatformShop items={shopItemsData} balance={balance} />
          </div>
        </section>

        <footer className="gp-footer">
          <b>SOCIALPRO GIVEAWAYS</b> · Sorteos gratuitos de creadores · Sin apuestas · +18 · Juega con
          responsabilidad
        </footer>
      </main>
    </>
  );
}
