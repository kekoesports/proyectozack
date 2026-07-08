'use client';

import { useState } from 'react';
import type { MissionWithProgress } from '@/types/giveawayPlatform';
import { DiscordMissionCard } from '@/features/giveaway-platform/components/DiscordMissionCard';
import { TwitchMissionCard } from '@/features/giveaway-platform/components/TwitchMissionCard';

interface Props {
  missions: MissionWithProgress[];
  /**
   * Info Discord del usuario (opcional): connected=true si tiene cuenta
   * conectada activa. inviteUrl para el CTA "Abrir Discord". Se omite si
   * el creador activo no tiene configurada la misión Discord.
   */
  discord?: {
    connected: boolean;
    inviteUrl: string | null;
  } | undefined;
  /**
   * Info Twitch del usuario (opcional): connected=true si tiene cuenta
   * conectada activa. channelUrl para el CTA "Abrir Twitch". Se omite si
   * el creador activo no tiene configurada la misión Twitch.
   */
  twitch?: {
    connected: boolean;
    channelUrl: string | null;
  } | undefined;
  /**
   * Cuando `discord` (real) está undefined pero sabemos que ese creador
   * tendrá misión Discord — se muestra placeholder "Próximamente" sin
   * botones OAuth. Cero contacto con DB / seeds / server actions.
   */
  discordComingSoon?: boolean;
  /**
   * Cuando `twitch` (real) está undefined pero sabemos que ese creador
   * tendrá misión Twitch — se muestra placeholder "Próximamente" con
   * link opcional al canal público (info abierta, no env var).
   */
  twitchComingSoon?: {
    channelUrl: string | null;
  } | null;
}

/**
 * Muestra misiones ordenadas por prioridad:
 *   1. Discord (provider='discord') → card interactiva propia arriba.
 *   2. Resto de misiones internas (top FEATURED_COUNT).
 *   3. Botón "Ver más" que expande el resto.
 *
 * Cobradas se envían al final dentro de cada grupo — no ocupan el top.
 */
export function MissionsGrid({ missions, discord, twitch, discordComingSoon, twitchComingSoon }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Split por provider: Discord y Twitch aparte para renderizado con card específica.
  const discordMissions = missions.filter((m) => m.provider === 'discord');
  const twitchMissions = missions.filter((m) => m.provider === 'twitch');
  const otherMissions = missions.filter((m) => m.provider !== 'discord' && m.provider !== 'twitch');

  // Empty state real: cero cards visibles de ningún tipo. El check previo
  // `missions.length === 0` era demasiado restrictivo — si había misiones
  // Discord/Twitch en el array pero sin `discord`/`twitch` props (fail-safe
  // de env vars), el usuario veía "no hay misiones" incluso con otras
  // internas potenciales. Aquí calculamos exactamente qué SE VA A RENDERIZAR.
  const hasDiscordCard = discordMissions.length > 0 && Boolean(discord);
  const hasTwitchCard = twitchMissions.length > 0 && Boolean(twitch);
  const hasInternalCard = otherMissions.length > 0;
  // Los placeholders "Próximamente" también cuentan como "algo visible" —
  // no queremos mostrar empty state si vamos a renderizar al menos un
  // placeholder social.
  const hasDiscordPlaceholder = !hasDiscordCard && Boolean(discordComingSoon);
  const hasTwitchPlaceholder = !hasTwitchCard && Boolean(twitchComingSoon);
  const hasAnyCard = hasDiscordCard || hasTwitchCard || hasInternalCard || hasDiscordPlaceholder || hasTwitchPlaceholder;

  if (!hasAnyCard) {
    return (
      <div className="gp-mission-empty" role="status" aria-live="polite">
        <p className="gp-mission-empty-title">Aún no hay misiones activas para este creador.</p>
        <p className="gp-mission-empty-sub">Vuelve pronto — se añaden a lo largo del mes.</p>
      </div>
    );
  }

  // Cobradas al final, resto en el orden que llega del server (sortOrder ASC).
  const sortedOther = [...otherMissions].sort((a, b) => Number(a.claimed) - Number(b.claimed));

  const FEATURED_COUNT = 4;
  const featured = sortedOther.slice(0, FEATURED_COUNT);
  const rest = sortedOther.slice(FEATURED_COUNT);
  const visible = expanded ? sortedOther : featured;

  return (
    <>
      <p className="gp-mission-head">Los puntos de todos los creadores se suman al mismo saldo.</p>

      {discordMissions.length > 0 && discord ? (
        <div className="gp-missions-grid">
          {discordMissions.map((m) => (
            <DiscordMissionCard
              key={m.id}
              mission={m}
              connected={discord.connected}
              inviteUrl={discord.inviteUrl}
            />
          ))}
        </div>
      ) : hasDiscordPlaceholder ? (
        <DiscordMissionsPlaceholder />
      ) : null}

      {twitchMissions.length > 0 && twitch ? (
        <div className="gp-missions-grid">
          {twitchMissions.map((m) => (
            <TwitchMissionCard
              key={m.id}
              mission={m}
              connected={twitch.connected}
              channelUrl={twitch.channelUrl}
            />
          ))}
        </div>
      ) : hasTwitchPlaceholder ? (
        <TwitchMissionsPlaceholder channelUrl={twitchComingSoon?.channelUrl ?? null} />
      ) : null}

      <div className="gp-missions-grid">
        {visible.map((m) => {
          const pct = m.goal > 0 ? Math.min(100, Math.round((m.current / m.goal) * 100)) : 0;
          return (
            <div key={m.id} className={`gp-mission-card${m.claimed ? ' is-done' : ''}`}>
              <div className="gp-mission-row">
                <h3 className="gp-mission-title">{m.claimed ? '✓ ' : ''}{m.title}</h3>
                <span className={`gp-mission-reward${m.claimed ? ' is-done' : ''}`}>
                  {m.claimed ? 'Cobrado' : `+${m.rewardCoins} ⭐`}
                </span>
              </div>
              <p className="gp-mission-desc">{m.description}</p>
              <div
                className="gp-mission-bar"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="gp-mission-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="gp-mission-foot">
                <span>{m.current} / {m.goal}</span>
                <span>{m.claimed ? 'Completada' : `${pct}%`}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <button
          type="button"
          className="gp-missions-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : `Ver ${rest.length} misiones más`}
        </button>
      ) : null}
      <YoutubeMissionsPlaceholder />
    </>
  );
}

/**
 * Placeholder informativo — misión Discord "Próximamente".
 *
 * Se muestra cuando el creador tiene `isDiscordComingSoon(slug) === true`
 * pero la card real todavía no puede renderizarse (falta env var, seed,
 * OAuth o TOKEN_ENCRYPTION_KEY). Sin botones OAuth, sin server actions,
 * sin puntos, sin claims. Cero contacto con DB.
 *
 * Cuando la config esté completa, `MissionsGrid` renderiza la card real
 * (`DiscordMissionCard`) y este placeholder deja de aparecer.
 */
function DiscordMissionsPlaceholder() {
  return (
    <div
      className="gp-missions-social-placeholder is-discord"
      role="note"
      aria-label="Misión Discord próximamente"
    >
      <div className="gp-missions-social-icon" aria-hidden>🎮</div>
      <div className="gp-missions-social-body">
        <div className="gp-missions-social-title">
          Discord <span className="gp-missions-social-soon">· Próximamente</span>
        </div>
        <p className="gp-missions-social-desc">
          Únete al Discord de ZACKETIZOR y consigue puntos cuando activemos esta misión.
        </p>
      </div>
    </div>
  );
}

/**
 * Placeholder informativo — misión Twitch "Próximamente".
 *
 * Igual que el de Discord, pero con enlace opcional al canal público
 * (info abierta — twitch.tv/<login>, no requiere env var). El link es
 * seguro: no dispara OAuth, no crea sesión, solo redirige al canal.
 */
function TwitchMissionsPlaceholder({ channelUrl }: { channelUrl: string | null }) {
  return (
    <div
      className="gp-missions-social-placeholder is-twitch"
      role="note"
      aria-label="Misión Twitch próximamente"
    >
      <div className="gp-missions-social-icon" aria-hidden>🎥</div>
      <div className="gp-missions-social-body">
        <div className="gp-missions-social-title">
          Twitch <span className="gp-missions-social-soon">· Próximamente</span>
        </div>
        <p className="gp-missions-social-desc">
          Sigue el canal de ZACKETIZOR y consigue puntos cuando activemos esta misión.
        </p>
        {channelUrl ? (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gp-missions-social-link"
          >
            Ver Twitch →
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Placeholder informativo — misiones YouTube "Próximamente".
 *
 * NO tiene botón de reclamar, verificar ni conectar. NO concede puntos.
 * NO simula verificación. Sólo comunica que la fase 2 (OAuth Google +
 * verificación real vía YouTube Data API v3) está en preparación.
 *
 * Ver `docs/youtube-missions-verification.md` para el plan por fases.
 */
function YoutubeMissionsPlaceholder() {
  return (
    <div
      className="gp-missions-yt-placeholder"
      role="note"
      aria-label="Misiones YouTube próximamente"
    >
      <div className="gp-missions-yt-icon" aria-hidden>
        📺
      </div>
      <div className="gp-missions-yt-body">
        <div className="gp-missions-yt-title">
          Misiones YouTube <span className="gp-missions-yt-soon">· Próximamente</span>
        </div>
        <p className="gp-missions-yt-desc">
          Conecta tu cuenta y completa acciones verificables (suscribirte a un canal,
          comentar en un vídeo) para ganar puntos. Estamos preparando la integración
          para que la verificación sea real y segura.
        </p>
      </div>
    </div>
  );
}
