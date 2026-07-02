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
  const giveawaysData = await getGiveawaysWithEntryData(active.id, userId);

  const [balance, missions, streak] = userId
    ? await Promise.all([
        getCoinBalance(userId),
        getMissionsWithProgress(userId),
        db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
      ])
    : [0, [], undefined];

  const [ranking, shopItemsData] = await Promise.all([
    getMonthlyRanking(10),
    getActiveShopItems(),
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
        <PlatformHero code={activeVisual.code} />

        <BrandBonusesSection creatorCode={activeVisual.code} creatorName={active.name} />

        {/* --- Bloques dinámicos (PR2 rediseñará) --- */}
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

        <section id="sorteos">
          <div className="gp-legacy-block">
            <h2>Sorteos de {active.name}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 14 }}>
              Participación gratuita · ganas +{ENTRY_COIN_REWARD} 🪙 por sorteo · fotos reales subidas desde el panel
            </p>
            <div
              style={{
                display: 'grid',
                gap: 24,
                gridTemplateColumns: 'repeat(auto-fill, minmax(228px, 1fr))',
              }}
            >
              {giveawaysData.map((g) => (
                <article
                  key={g.id}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    background: 'var(--panel2)',
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imageUrl} alt={g.title} style={{ maxHeight: 128, margin: '0 auto' }} />
                  ) : (
                    <div
                      style={{
                        height: 128,
                        borderRadius: 10,
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px dashed rgba(139,61,255,.4)',
                        color: 'var(--muted)',
                        fontSize: 11,
                      }}
                    >
                      📷 Foto de la skin (panel admin)
                    </div>
                  )}
                  <h3 style={{ marginTop: 10, fontSize: 15, fontWeight: 700 }}>★ {g.title}</h3>
                  {g.value ? <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{g.value}</div> : null}
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                    👥 <b style={{ color: 'var(--cyan)' }}>{g.entryCount.toLocaleString('es-ES')}</b> participantes
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--gold)' }}>
                    Gratis · +{ENTRY_COIN_REWARD} 🪙
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {userId ? (
                      <EntryButton giveawayId={g.id} initialEntered={g.userHasEntered} />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Inicia sesión para participar</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ranking">
          <div className="gp-legacy-block">
            <h2>Ranking mensual</h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
              Mide participación (tickets), nunca dinero. Los perfiles privados aparecen enmascarados.
            </p>
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
