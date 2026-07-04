import { headers } from 'next/headers';
import { eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dailyStreaks, playerProfiles, talents } from '@/db/schema';
import {
  getActiveShopItems,
  getCoinBalance,
  getGiveawaysWithEntryData,
  getMissionsWithProgress,
  getMonthlyRanking,
  getMonthlyRankingTotal,
} from '@/lib/queries/giveawayPlatform';
import {
  PLATFORM_CREATOR_SLUGS,
  ENTRY_COIN_REWARD,
  todayInPlatformTz,
} from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { getDiscordMissionTarget, isDiscordOauthConfigured } from '@/features/giveaway-platform/constants/discord-missions';
import { isTokenEncryptionConfigured } from '@/lib/crypto/token-encryption';
import { getConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { PlatformNav } from '@/features/giveaway-platform/components/PlatformNav';
import { PlatformHero } from '@/features/giveaway-platform/components/PlatformHero';
import { BrandBonusesSection } from '@/features/giveaway-platform/components/BrandBonusesSection';
import { DailyStreakCard } from '@/features/giveaway-platform/components/DailyStreakCard';
import { MissionsGrid } from '@/features/giveaway-platform/components/MissionsGrid';
import { EntryButton } from '@/features/giveaway-platform/components/EntryButton';
import { PlatformShop } from '@/features/giveaway-platform/components/PlatformShop';
import { MonthlyRanking } from '@/features/giveaway-platform/components/MonthlyRanking';
import { HistoricalWinnersPlaceholder } from '@/features/giveaway-platform/components/HistoricalWinnersPlaceholder';
import { ExternalGiveawaysSection } from '@/features/giveaway-platform/components/ExternalGiveawaysSection';
import { PlatformFooter } from '@/features/giveaway-platform/components/PlatformFooter';
import { PlatformShell } from '@/features/giveaway-platform/components/PlatformShell';
import { SteamLoginButton } from '@/features/giveaway-platform/components/SteamLoginButton';
import { getExternalGiveawaysForCreator } from '@/lib/queries/externalGiveaways';
import { isExternalCreator } from '@/lib/external-giveaways/creator-bindings';
import type { ExternalGiveawaySections } from '@/lib/external-giveaways/types';

interface Props {
  /** slug del creador (validado contra PLATFORM_CREATOR_SLUGS). */
  slug: string;
}

/**
 * Server Component. Landing pública por creador de SocialPro Giveaways.
 *
 * Antes vivía inline en `/sorteos/plataforma/page.tsx` con query param
 * `?creador=<slug>`. Extraído aquí para poder reutilizar en la nueva
 * ruta canónica `/sorteos/[creatorSlug]/page.tsx` sin duplicar lógica.
 *
 * Guard: si el slug no está en `PLATFORM_CREATOR_SLUGS` → `notFound()`.
 * Con esto los slugs typo (ej. "zackezitor") caen en 404 salvo que
 * `next.config.ts` haya añadido un redirect defensivo antes.
 */
export async function PlatformCreatorLanding({ slug }: Props) {
  if (!PLATFORM_CREATOR_SLUGS.includes(slug as (typeof PLATFORM_CREATOR_SLUGS)[number])) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  const dbCreators = await db.query.talents.findMany({
    where: inArray(talents.slug, [...PLATFORM_CREATOR_SLUGS]),
  });
  const active = dbCreators.find((c) => c.slug === slug);
  if (!active) notFound();

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

  const activeVisual = getCreatorVisual(active.slug);
  // Regla: 1 creador = 1 fuente. Si el creador tiene binding externo,
  // sus sorteos vienen del provider externo — la sección interna se oculta.
  const isExternal = isExternalCreator(active.slug);
  const giveawaysData = isExternal
    ? []
    : await getGiveawaysWithEntryData(active.id, userId);

  const [balance, missions, streak, playerProfile, discordAccount] = userId
    ? await Promise.all([
        getCoinBalance(userId),
        getMissionsWithProgress(userId),
        db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
        db.query.playerProfiles.findFirst({
          where: eq(playerProfiles.userId, userId),
          columns: { steamTradeUrl: true },
        }),
        getConnectedAccount(userId, 'discord'),
      ])
    : [0, [], undefined, undefined, null];

  // Config Discord del creador activo. La card Discord solo se muestra si
  // TODAS las piezas están puestas:
  //   1) Target del creador (guild id + invite URL) → `getDiscordMissionTarget`.
  //   2) OAuth mínimo (client id/secret/redirect) → `isDiscordOauthConfigured`.
  //   3) Cifrado de tokens (clave AES) → `isTokenEncryptionConfigured`.
  // Si alguna falta, `discordProp` queda undefined y la grid oculta la card
  // — fail-safe: nada de botones que rompan a mitad de flujo.
  const discordTarget = getDiscordMissionTarget(active.slug);
  const discordProp =
    discordTarget && isDiscordOauthConfigured() && isTokenEncryptionConfigured()
      ? {
          connected: Boolean(discordAccount),
          inviteUrl: discordTarget.inviteUrl ?? null,
        }
      : undefined;

  const hasSteamTradeUrl = Boolean(playerProfile?.steamTradeUrl && playerProfile.steamTradeUrl.trim().length > 0);

  const [ranking, rankingTotal, shopItemsData, externalSections] = await Promise.all([
    getMonthlyRanking(10),
    getMonthlyRankingTotal(),
    getActiveShopItems(),
    isExternal
      ? getExternalGiveawaysForCreator(active.slug)
      : Promise.resolve<ExternalGiveawaySections>({
          active: [],
          finished: [],
          providerKey: null,
          status: 'no_binding',
        }),
  ]);

  const today = todayInPlatformTz();
  const claimedToday = streak?.lastClaimDate === today;

  return (
    <PlatformShell>
      <PlatformNav
        creators={creatorOptions}
        activeSlug={active.slug}
        userName={userName}
        userImage={userImage}
        balance={balance}
        loggedIn={Boolean(userId)}
      />

      <main className="gp-wrap">
        <PlatformHero code={activeVisual.code} creatorName={active.name} />
        <BrandBonusesSection creatorSlug={active.slug} creatorCode={activeVisual.code} />

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
                <h2>Misiones · gana puntos</h2>
                <MissionsGrid missions={missions} discord={discordProp} />
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="gp-legacy-block gp-login-prompt">
              <p>Inicia sesión con Steam para participar en los sorteos, completar misiones y ganar puntos.</p>
              <SteamLoginButton size="lg" />
            </div>
          </section>
        )}

        {isExternal ? null : (
          <section id="sorteos">
            <div className="gp-legacy-block">
              <h2>Sorteos de {active.name}</h2>
              <p className="gp-rank-note">
                Participación gratuita · ganas +{ENTRY_COIN_REWARD} ⭐ por sorteo · fotos reales de las skins
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
                        Gratis · +{ENTRY_COIN_REWARD} ⭐
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

        <ExternalGiveawaysSection sections={externalSections} creatorDisplayName={active.name} />

        <section id="ranking">
          <div className="gp-legacy-block">
            <h2>Ranking global · mensual</h2>
            <MonthlyRanking rows={ranking} totalPlayers={rankingTotal} currentUserId={userId} />
            <HistoricalWinnersPlaceholder />
          </div>
        </section>

        <section id="recompensas">
          <div className="gp-legacy-block">
            <h2>Recompensas · canjea tus puntos</h2>
            <PlatformShop items={shopItemsData} balance={balance} hasSteamTradeUrl={hasSteamTradeUrl} />
          </div>
        </section>

        <PlatformFooter />
      </main>
    </PlatformShell>
  );
}
