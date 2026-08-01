import { headers } from 'next/headers';
import { eq, inArray } from 'drizzle-orm';
import { hasActivePartnerConsent } from '@/lib/queries/partnerConsent';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dailyStreaks, playerProfiles, talents } from '@/db/schema';
import {
  getActiveShopItems,
  getCoinBalance,
  getFreeRafflesForCreator,
  getGiveawaysWithEntryData,
  getMissionsWithProgress,
  getMonthlyPointsRanking,
  getMonthlyPointsRankingTotal,
  getUserMonthlyStanding,
} from '@/lib/queries/giveawayPlatform';
import {
  PLATFORM_CREATOR_SLUGS,
  todayInPlatformTz,
  previousDay,
} from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { getDiscordMissionTarget, isDiscordOauthConfigured, isDiscordComingSoon } from '@/features/giveaway-platform/constants/discord-missions';
import { getTwitchMissionTarget, isTwitchOauthConfigured, isTwitchComingSoon, getTwitchPublicChannelUrl } from '@/features/giveaway-platform/constants/twitch-missions';
import { isTokenEncryptionConfigured } from '@/lib/crypto/token-encryption';
import { getConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { PlatformNav } from '@/features/giveaway-platform/components/PlatformNav';
import { PlatformHero } from '@/features/giveaway-platform/components/PlatformHero';
import { BrandBonusesSection } from '@/features/giveaway-platform/components/BrandBonusesSection';
import { DailyStreakCard } from '@/features/giveaway-platform/components/DailyStreakCard';
import { MissionsGrid } from '@/features/giveaway-platform/components/MissionsGrid';
import { EntryButton } from '@/features/giveaway-platform/components/EntryButton';
import { RewardsHub } from '@/features/giveaway-platform/components/RewardsHub';
import { MonthlyPointsRanking } from '@/features/giveaway-platform/components/MonthlyPointsRanking';
import { HistoricalWinnersPlaceholder } from '@/features/giveaway-platform/components/HistoricalWinnersPlaceholder';
import { ExternalGiveawaysSection } from '@/features/giveaway-platform/components/ExternalGiveawaysSection';
import { PlatformFooter } from '@/features/giveaway-platform/components/PlatformFooter';
import { PlatformShell } from '@/features/giveaway-platform/components/PlatformShell';
import { SteamLoginButton } from '@/features/giveaway-platform/components/SteamLoginButton';
import { getExternalGiveawaysForCreator } from '@/lib/queries/externalGiveaways';
import { isExternalCreator } from '@/lib/external-giveaways/creator-bindings';
import type { ExternalGiveawaySections } from '@/lib/external-giveaways/types';
import { getGeoLegalConfig } from '@/lib/geo-legal-config';
import { AdultAttestationCard } from './AdultAttestationCard';

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

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  // Consent gate para cards de partners externos (Fase 1 legal).
  // Fuente de verdad → tabla `user_partner_consents`. Requiere sesión
  // activa (si no hay login, el gate fuerza el login antes del modal).
  // Ver docs/legal-risk-matrix.md.
  const partnerConsentGranted = await hasActivePartnerConsent(userId);
  const country = requestHeaders.get('x-vercel-ip-country');
  const geoLegal = getGeoLegalConfig(country);
  const partnerContentAllowed =
    partnerConsentGranted
    && geoLegal.keydropExternalCTAs
    && geoLegal.externalPartnerCTAs;

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

  const [balance, missions, streak, playerProfile, discordAccount, twitchAccount] = userId
    ? await Promise.all([
        getCoinBalance(userId),
        getMissionsWithProgress(userId),
        db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
        db.query.playerProfiles.findFirst({
          where: eq(playerProfiles.userId, userId),
          columns: { steamTradeUrl: true, adultAttestedAt: true },
        }),
        getConnectedAccount(userId, 'discord'),
        getConnectedAccount(userId, 'twitch'),
      ])
    : await Promise.all([
        Promise.resolve(0),
        // Misiones activas sin progreso — permite CTAs públicas (Abrir Discord).
        getMissionsWithProgress(null),
        Promise.resolve(undefined),
        Promise.resolve(undefined),
        Promise.resolve(null),
        Promise.resolve(null),
      ]);

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

  // Modo "Próximamente" Discord — se muestra un placeholder anunciando la
  // misión SOLO si el creador tiene el flag `isDiscordComingSoon` Y la card
  // real todavía no puede renderizarse. Cuando la config se complete, el
  // placeholder desaparece automáticamente y aparece la card real.
  const discordComingSoon = !discordProp && isDiscordComingSoon(active.slug);

  // Config Twitch — misma lógica fail-safe que Discord. La card Twitch
  // solo aparece si target del creador + OAuth + cifrado están todos
  // configurados.
  const twitchTarget = getTwitchMissionTarget(active.slug);
  const twitchProp =
    twitchTarget && isTwitchOauthConfigured() && isTokenEncryptionConfigured()
      ? {
          connected: Boolean(twitchAccount),
          channelUrl: twitchTarget.channelUrl ?? null,
        }
      : undefined;

  // Placeholder Twitch — como Discord, pero además incluye el channel URL
  // público (info abierta, no env) para el CTA "Ver Twitch".
  const twitchComingSoon = !twitchProp && isTwitchComingSoon(active.slug)
    ? { channelUrl: getTwitchPublicChannelUrl(active.slug) }
    : null;

  const hasSteamTradeUrl = Boolean(playerProfile?.steamTradeUrl && playerProfile.steamTradeUrl.trim().length > 0);

  const [pointsRanking, rankingTotal, shopItemsData, externalSections, freeRaffles, myStanding] = await Promise.all([
    getMonthlyPointsRanking(10),
    getMonthlyPointsRankingTotal(),
    getActiveShopItems(country),
    isExternal && partnerContentAllowed
      ? getExternalGiveawaysForCreator(active.slug)
      : Promise.resolve<ExternalGiveawaySections>({
          active: [],
          finished: [],
          providerKey: null,
          status: 'no_binding',
        }),
    getFreeRafflesForCreator(active.id, userId),
    userId ? getUserMonthlyStanding(userId) : Promise.resolve(null),
  ]);

  const today = todayInPlatformTz();
  const yesterday = previousDay(today);
  const claimedToday = streak?.lastClaimDate === today;
  // Racha rota si hay streak pero ni hoy ni ayer se reclamó → el próximo
  // claim reseteará a día 1 en el server. Sin streak = nunca reclamó =
  // no está "roto", empezará limpio en día 1 (misma UX que rota).
  const streakBroken = Boolean(streak)
    && streak?.lastClaimDate !== today
    && streak?.lastClaimDate !== yesterday;

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
        <BrandBonusesSection
          creatorSlug={active.slug}
          creatorCode={activeVisual.code}
          isLoggedIn={Boolean(userId)}
          partnerConsentGranted={partnerConsentGranted}
          externalCtasAllowed={partnerContentAllowed}
        />

        {userId ? (
          <>
            {/*
              Gate +18 solo aplica a usuarios con `player_profiles` (login vía Steam).
              Admins/staff sin fila en `player_profiles` no ven el gate — no pueden
              participar/canjear porque los guards server-side de participateInGiveaway
              y redeemShopItem exigen `adultAttestedAt`. Ver `player_profiles.ts` comment.
            */}
            {playerProfile && !playerProfile.adultAttestedAt ? <AdultAttestationCard /> : null}
            <section id="racha">
              <div className="gp-legacy-block">
                <h2>Recompensa diaria</h2>
                <DailyStreakCard
                  currentDay={streak?.currentDay ?? 0}
                  claimedToday={claimedToday}
                  streakBroken={streakBroken}
                />
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

        {/*
          Misiones siempre visibles (logueado o no): el CTA "Abrir Discord"
          debe funcionar sin sesión. Verificar/reclamar sigue exigiendo login
          en la card y en las server actions.
        */}
        <section id="misiones">
          <div className="gp-legacy-block">
            <h2>Misiones · gana puntos</h2>
            <MissionsGrid
              missions={missions}
              discord={discordProp}
              twitch={twitchProp}
              discordComingSoon={discordComingSoon}
              twitchComingSoon={twitchComingSoon}
              loggedIn={Boolean(userId)}
              creatorSlug={active.slug}
            />
          </div>
        </section>

        {isExternal ? null : (
          <section id="sorteos">
            <div className="gp-legacy-block">
              <h2>Sorteos de {active.name}</h2>
              <p className="gp-rank-note">
                Participación gratuita · puntos según cada sorteo · fotos reales de las skins
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
                        Gratis{g.entryAwardCoins > 0 ? ` · +${g.entryAwardCoins} ⭐` : ''}
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

        {/* Banner nav "Ranking" → #ranking (full-width monthly points leaderboard). */}
        <section id="ranking" className="gp-ranking-section" aria-labelledby="gp-ranking-heading">
          <div className="gp-ranking-section-inner">
            <header className="gp-ranking-section-header">
              <p className="gp-ranking-section-kicker">Competición del mes</p>
              <h2 id="gp-ranking-heading">Ranking mensual</h2>
              <p className="gp-ranking-section-lede">
                Los jugadores que más puntos suman con misiones y rachas pelean por el podio y los
                premios del mes.
              </p>
            </header>
            <MonthlyPointsRanking
              rows={pointsRanking}
              totalParticipants={rankingTotal}
              myStanding={myStanding}
              isLoggedIn={Boolean(userId)}
              variant="page"
            />
          </div>
        </section>

        <section id="recompensas">
          <div className="gp-legacy-block">
            <h2>Recompensas</h2>
            <RewardsHub
              shopItems={shopItemsData}
              balance={balance}
              hasSteamTradeUrl={hasSteamTradeUrl}
              freeRaffles={freeRaffles}
              isLoggedIn={Boolean(userId)}
            />
            <HistoricalWinnersPlaceholder />
          </div>
        </section>

        <PlatformFooter />
      </main>
    </PlatformShell>
  );
}
