import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dailyStreaks, talents } from '@/db/schema';
import {
  getCoinBalance,
  getPlayerProfile,
  getUserRedemptions,
  getUserStats,
  getUserTransactions,
} from '@/lib/queries/giveawayPlatform';
import { PLATFORM_CREATOR_SLUGS, todayInPlatformTz } from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { PlatformNav } from '@/features/giveaway-platform/components/PlatformNav';
import { ProfileSettingsForm } from '@/features/giveaway-platform/components/ProfileSettingsForm';
import { SteamAvatar } from '@/features/giveaway-platform/components/SteamAvatar';
import { PlatformFooter } from '@/features/giveaway-platform/components/PlatformFooter';
import { PlatformShell } from '@/features/giveaway-platform/components/PlatformShell';

export const metadata = {
  title: 'Mi perfil · SocialPro Sorteos',
  robots: { index: false, follow: false },
};

const SOURCE_LABEL: Record<string, string> = {
  racha: 'Racha diaria',
  mision: 'Misión',
  sorteo: 'Participación',
  tienda: 'Canje',
  admin: 'Ajuste',
};

const REDEMPTION_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  if (!userId) {
    // Sin sesión: al índice público. El pill de usuario ofrece el botón de
    // login con Steam desde ahí.
    redirect('/sorteos');
  }

  const dbCreators = await db.query.talents.findMany({
    where: inArray(talents.slug, [...PLATFORM_CREATOR_SLUGS]),
  });
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

  const [balance, streak, profile, stats, transactions, userRedemptions] = await Promise.all([
    getCoinBalance(userId),
    db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
    getPlayerProfile(userId),
    getUserStats(userId),
    getUserTransactions(userId, 10),
    getUserRedemptions(userId),
  ]);

  const today = todayInPlatformTz();
  const claimedToday = streak?.lastClaimDate === today;

  return (
    <PlatformShell>
      <PlatformNav
        creators={creatorOptions}
        activeSlug={creatorOptions[0]?.slug ?? ''}
        userName={userName}
        userImage={userImage}
        balance={balance}
        loggedIn
      />

      <main className="gp-wrap">
        <section className="gp-profile-hero">
          <div className="gp-profile-avatar">
            <SteamAvatar imageUrl={userImage} name={userName} size={84} />
          </div>
          <div className="gp-profile-head">
            <h1>{userName ?? 'Jugador Steam'}</h1>
            <p className="gp-profile-sub">
              {profile?.steamId ? <>Steam ID: <code>{profile.steamId}</code></> : 'Perfil vinculado con Steam'}
              {profile?.isPrivate ? <span className="gp-profile-badge">🔒 Privado</span> : <span className="gp-profile-badge on">🌐 Público</span>}
            </p>
          </div>
        </section>

        <section className="gp-profile-stats">
          <div className="gp-profile-stat">
            <span className="l">⭐ Saldo</span>
            <b>{balance.toLocaleString('es-ES')}</b>
            <span className="s">puntos disponibles</span>
          </div>
          <div className="gp-profile-stat">
            <span className="l">🔥 Racha</span>
            <b>{streak?.currentDay ?? 0}<span className="unit">/7</span></b>
            <span className="s">{claimedToday ? 'reclamada hoy' : 'pendiente hoy'}</span>
          </div>
          <div className="gp-profile-stat">
            <span className="l">🎯 Participaciones</span>
            <b>{stats.entriesTotal.toLocaleString('es-ES')}</b>
            <span className="s">{stats.entriesMonth} este mes</span>
          </div>
          <div className="gp-profile-stat">
            <span className="l">👥 Creadores</span>
            <b>{stats.distinctCreators}</b>
            <span className="s">jugados en total</span>
          </div>
        </section>

        <section className="gp-legacy-block">
          <h2>Ajustes de cuenta</h2>
          <ProfileSettingsForm
            initialIsPrivate={profile?.isPrivate ?? true}
            initialSteamTradeUrl={profile?.steamTradeUrl ?? null}
          />
          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link
              href="/sorteos/perfil/permisos"
              style={{ color: '#f5632a', textDecoration: 'underline' }}
            >
              Ver mis permisos y consentimientos →
            </Link>
          </p>
        </section>

        <section className="gp-legacy-block">
          <h2>🎒 Inventario</h2>
          {userRedemptions.length === 0 ? (
            <p className="gp-rank-empty">
              Aún no has canjeado ninguna recompensa. Consigue puntos con misiones y sorteos.
            </p>
          ) : (
            <ul className="gp-profile-inv">
              {userRedemptions.map((r) => (
                <li key={r.id}>
                  <div className="gp-profile-inv-thumb" aria-hidden>
                    {r.shopItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.shopItem.imageUrl} alt="" />
                    ) : (
                      <span>🎁</span>
                    )}
                  </div>
                  <div className="gp-profile-inv-body">
                    <b>{r.shopItem.name}</b>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                  <span className={`gp-profile-inv-status s-${r.status}`}>
                    {REDEMPTION_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-legacy-block">
          <h2>🧾 Últimas transacciones</h2>
          {transactions.length === 0 ? (
            <p className="gp-rank-empty">Aún no tienes movimientos de puntos.</p>
          ) : (
            <ul className="gp-profile-tx">
              {transactions.map((t) => (
                <li key={t.id}>
                  <span className="gp-profile-tx-src">{SOURCE_LABEL[t.source] ?? t.source}</span>
                  <span className="gp-profile-tx-date">{formatDate(t.createdAt)}</span>
                  <span className={`gp-profile-tx-amt ${t.amount >= 0 ? 'pos' : 'neg'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('es-ES')} ⭐
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PlatformFooter />
      </main>
    </PlatformShell>
  );
}
