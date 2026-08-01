'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MissionWithProgress } from '@/types/giveawayPlatform';
import { verifyDiscordMission } from '@/app/sorteos/plataforma/discord-mission-action';
import { SteamLoginButton } from '@/features/giveaway-platform/components/SteamLoginButton';

type UiState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; code: string; message: string };

interface Props {
  mission: MissionWithProgress;
  /** ¿Ha conectado el usuario su cuenta Discord? */
  connected: boolean;
  /** URL de invite pública de la guild — solo para el CTA "Abrir Discord". */
  inviteUrl: string | null;
  /** Sin sesión Steam el OAuth Discord responde 401 — mostramos login. */
  loggedIn?: boolean;
  /** Para el return path del OAuth (`/sorteos/<slug>`). */
  creatorSlug?: string;
}

/** Derive OAuth callback UI from query params (no setState-in-effect). */
function oauthUiFromSearchParams(
  searchParams: { get: (key: string) => string | null },
  rewardCoins: number,
): UiState | null {
  const status = searchParams.get('discord_status');
  if (!status) return null;
  if (status === 'rewarded') {
    const coins = searchParams.get('coins') ?? String(rewardCoins);
    return { kind: 'success', message: `¡+${coins} puntos!` };
  }
  if (status === 'connected_join_server') {
    return {
      kind: 'error',
      code: 'not_verified',
      message: 'Discord conectado. Únete al servidor y verifica.',
    };
  }
  if (status === 'account_in_use') {
    return {
      kind: 'error',
      code: 'internal',
      message: 'Esa cuenta Discord ya está vinculada a otro usuario.',
    };
  }
  if (status === 'encrypt_failed' || status === 'discord_not_configured') {
    return {
      kind: 'error',
      code: 'internal',
      message: 'No se pudo conectar Discord. Inténtalo más tarde.',
    };
  }
  return null;
}

/**
 * Card interactiva para misiones Discord con verificación real vía OAuth
 * (identify + guilds). Nunca simula: si el usuario no está en la guild,
 * `verifyDiscordMission` devuelve `not_verified` y aquí lo mostramos.
 *
 * Estados:
 *   1. Cobrada       → Card en modo "is-done", sin botón.
 *   2. No conectado  → CTA "Conectar Discord" (redirige a OAuth).
 *   3. Conectado     → CTA doble: "Abrir Discord" (invite) + "Verificar".
 *   4. Verificando   → Botón bloqueado, texto "Verificando...".
 *   5. Error de API  → Mensaje + botón "Reintentar".
 *
 * Nunca almacena en cliente ningún dato personal Discord — todo se
 * verifica vía server action con el token cifrado en BD.
 */
export function DiscordMissionCard({
  mission,
  connected,
  inviteUrl,
  loggedIn = false,
  creatorSlug,
}: Props) {
  const [uiState, setUiState] = useState<UiState>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Interactive verify flow overrides OAuth-derived feedback when not idle.
  const oauthUi = oauthUiFromSearchParams(searchParams, mission.rewardCoins);
  const displayState: UiState = uiState.kind !== 'idle' ? uiState : (oauthUi ?? uiState);

  const isDone = mission.claimed;
  const showError = displayState.kind === 'error';
  const showSuccess = displayState.kind === 'success';
  const returnPath = creatorSlug ? `/sorteos/${creatorSlug}` : '/sorteos';

  // After OAuth reward, refresh RSC tree only — UI feedback is derived above.
  useEffect(() => {
    if (searchParams.get('discord_status') === 'rewarded') {
      router.refresh();
    }
  }, [searchParams, router]);

  function onVerifyClick() {
    setUiState({ kind: 'verifying' });
    startTransition(async () => {
      const result = await verifyDiscordMission({ missionId: mission.id });
      if (result.ok) {
        setUiState({
          kind: 'success',
          message: `¡+${result.rewardCoins} puntos!`,
        });
        router.refresh();
        return;
      }
      setUiState({ kind: 'error', code: result.code, message: result.message });
    });
  }

  const openDiscordCta = inviteUrl ? (
    <a
      href={inviteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="gp-mission-discord-btn is-secondary"
    >
      Abrir Discord
    </a>
  ) : null;

  return (
    <div className={`gp-mission-card gp-mission-card-discord${isDone ? ' is-done' : ''}`}>
      <div className="gp-mission-row">
        <h3 className="gp-mission-title">
          {isDone ? '✓ ' : ''}
          <span className="gp-mission-discord-tag" aria-hidden>Discord</span>{' '}
          {mission.title}
        </h3>
        <span className={`gp-mission-reward${isDone ? ' is-done' : ''}`}>
          {isDone ? 'Cobrado' : `+${mission.rewardCoins} ⭐`}
        </span>
      </div>

      {isDone ? null : (
        <>
          {mission.description ? (
            <p className="gp-mission-desc">{mission.description}</p>
          ) : null}
          {connected && !showError ? (
            <p className="gp-mission-discord-hint">
              Únete al servidor y verifica.
            </p>
          ) : null}
          <div className="gp-mission-discord-actions">
            {connected ? (
              <>
                {openDiscordCta}
                <button
                  type="button"
                  className="gp-mission-discord-btn is-primary"
                  onClick={onVerifyClick}
                  disabled={pending || displayState.kind === 'verifying'}
                  aria-busy={pending}
                >
                  {pending || displayState.kind === 'verifying' ? 'Verificando...' : 'Verificar'}
                </button>
              </>
            ) : loggedIn ? (
              <>
                {openDiscordCta}
                <Link
                  href={`/api/auth/social/discord/connect?return=${encodeURIComponent(returnPath)}`}
                  className="gp-mission-discord-btn is-primary"
                  prefetch={false}
                >
                  Conectar Discord
                </Link>
              </>
            ) : (
              <>
                {openDiscordCta}
                <SteamLoginButton size="md" />
              </>
            )}
          </div>
        </>
      )}

      {/* Success stays visible even when claimed — OAuth auto-claim lands with
          isDone already true (?discord_status=rewarded) and must still show +pts. */}
      {showSuccess && displayState.kind === 'success' ? (
        <div className="gp-mission-discord-success" role="status">
          {displayState.message}
        </div>
      ) : null}

      {showError && !isDone && displayState.kind === 'error' ? (
        <div className="gp-mission-discord-error" role="alert">
          {displayState.message}
        </div>
      ) : null}

      {!isDone ? (
        <p className="gp-mission-discord-note">
          Solo comprobamos que estás en el servidor. No leemos mensajes.
        </p>
      ) : null}
    </div>
  );
}
