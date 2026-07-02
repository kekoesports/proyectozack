import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { playerProfiles } from '@/db/schema';
import { getCoinBalance } from '@/lib/queries/giveawayPlatform';
import { getConnectedAccountsSafe } from '@/lib/social/accounts';
import { getProvider, isActiveProvider, isProviderConfigured, listAllProviders } from '@/lib/social/providers';
import { SocialAccountCard } from '@/features/giveaway-platform/components/SocialAccountCard';

export const metadata: Metadata = {
  title: 'Mi perfil | SocialPro Giveaways',
  robots: { index: false, follow: false },
};

/**
 * Server component: /sorteos/plataforma/perfil
 *
 * Muestra la cabecera con datos de Steam, saldo, y las tarjetas de
 * cuentas sociales conectadas. Sin logueo → redirige al hero.
 */
export default async function PlayerProfilePageRoute({
  searchParams,
}: {
  searchParams: Promise<{ social?: string; social_error?: string; provider?: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sorteos/plataforma');
  const userId = session.user.id;

  const [profile, balance, socialAccounts] = await Promise.all([
    db.query.playerProfiles.findFirst({ where: eq(playerProfiles.userId, userId) }),
    getCoinBalance(userId),
    getConnectedAccountsSafe(userId),
  ]);

  const { social, social_error, provider } = await searchParams;
  const notice = social === 'connected'
    ? { kind: 'success' as const, text: `Cuenta ${provider ?? ''} conectada correctamente.` }
    : social_error
      ? { kind: 'error' as const, text: mapErrorToLabel(social_error, provider) }
      : null;

  const connectedByProvider = new Map(socialAccounts.map((a) => [a.provider, a]));

  return (
    <main className="gp-wrap gp-perfil">
      <header className="gp-perfil-header">
        <h1>Mi perfil</h1>
        <p className="gp-perfil-sub">Cuentas conectadas y configuración de SocialPro Giveaways</p>
      </header>

      {notice ? (
        <div className={`gp-perfil-notice gp-perfil-notice-${notice.kind}`}>{notice.text}</div>
      ) : null}

      <section className="gp-perfil-block" aria-labelledby="perfil-steam">
        <h2 id="perfil-steam">Cuenta principal</h2>
        <div className="gp-perfil-steam">
          <div className="gp-perfil-steam-avatar" aria-hidden>🎮</div>
          <div>
            <div className="gp-perfil-steam-name">{session.user.name}</div>
            <div className="gp-perfil-steam-meta">Saldo: <b>{balance.toLocaleString('es-ES')} 🪙</b></div>
            <div className="gp-perfil-steam-meta">Estado: verificado con Steam OpenID</div>
          </div>
        </div>
      </section>

      <section className="gp-perfil-block" aria-labelledby="perfil-social">
        <h2 id="perfil-social">Cuentas conectadas</h2>
        <p className="gp-perfil-note">
          Enlaza tus cuentas sociales para poder participar en misiones que verificamos
          automáticamente (RT, follow, join Discord…). Los tokens se guardan cifrados.
        </p>
        <div className="gp-social-grid">
          {/* Steam siempre aparece como principal, sin desconectar */}
          <SocialAccountCard
            providerKey="steam"
            displayName="Steam"
            status="connected"
            username={session.user.name}
            disableDisconnect
          />
          {listAllProviders().map((key) => {
            const cfg = getProvider(key);
            if (!cfg) return null;
            const account = connectedByProvider.get(key);
            if (cfg.status === 'planned') {
              return (
                <SocialAccountCard
                  key={key}
                  providerKey={key}
                  displayName={cfg.displayName}
                  status="planned"
                  reasonIfPlanned={cfg.reason}
                />
              );
            }
            if (!isActiveProvider(key) || !isProviderConfigured(key)) {
              return (
                <SocialAccountCard
                  key={key}
                  providerKey={key}
                  displayName={cfg.displayName}
                  status="not_configured"
                />
              );
            }
            if (account) {
              return (
                <SocialAccountCard
                  key={key}
                  providerKey={key}
                  displayName={cfg.displayName}
                  status="connected"
                  username={account.username}
                  avatarUrl={account.avatarUrl}
                  updatedAt={account.updatedAt.toISOString()}
                />
              );
            }
            return (
              <SocialAccountCard
                key={key}
                providerKey={key}
                displayName={cfg.displayName}
                status="available"
                connectHref={`/api/social/${key}/connect`}
              />
            );
          })}
        </div>
      </section>

      <section className="gp-perfil-block" aria-labelledby="perfil-settings">
        <h2 id="perfil-settings">Configuración</h2>
        <ul className="gp-perfil-settings">
          <li>
            <span className="gp-perfil-settings-label">Privacidad del ranking</span>
            <span className="gp-perfil-settings-value">
              {profile?.isPrivate ? 'Privado (nombre enmascarado)' : 'Público'}
            </span>
          </li>
          <li>
            <span className="gp-perfil-settings-label">Steam Trade URL</span>
            <span className="gp-perfil-settings-value">
              {profile?.steamTradeUrl ? '✓ configurada' : '— no configurada'}
            </span>
          </li>
          <li>
            <span className="gp-perfil-settings-label">Dirección de envío</span>
            <span className="gp-perfil-settings-value">
              {profile?.shippingAddress ? '✓ configurada' : '— no configurada'}
            </span>
          </li>
          <li>
            <span className="gp-perfil-settings-label">Email</span>
            <span className="gp-perfil-settings-value">
              {session.user.email && !session.user.email.endsWith('@steam.socialpro.internal')
                ? session.user.email
                : 'Sin email real (login solo con Steam)'}
            </span>
          </li>
        </ul>
        <p className="gp-perfil-note">
          La edición avanzada de trade URL, dirección y privacidad se hace desde el modal
          del perfil de la plataforma principal (server actions ya existentes).
        </p>
      </section>
    </main>
  );
}

function mapErrorToLabel(code: string, provider: string | undefined): string {
  const p = provider ?? 'la cuenta';
  switch (code) {
    case 'state':                       return `No pudimos validar la solicitud de ${p}. Inténtalo de nuevo.`;
    case 'no_code':                     return `${p} no devolvió un código de autorización.`;
    case 'user_denied':                 return `Cancelaste la conexión con ${p}.`;
    case 'already_linked':              return `Esta cuenta de ${p} ya está enlazada a otro usuario.`;
    case 'exchange_or_profile_failed':  return `Fallo al hablar con ${p}. Inténtalo en unos minutos.`;
    case 'provider_not_configured':    return `${p} no está configurado por el administrador todavía.`;
    default:                            return `Error al conectar ${p}.`;
  }
}
