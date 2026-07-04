'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { MissionWithProgress } from '@/types/giveawayPlatform';
import { verifyTwitchMission } from '@/app/sorteos/plataforma/twitch-mission-action';

type UiState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'error'; code: string; message: string };

interface Props {
  mission: MissionWithProgress;
  /** ¿Ha conectado el usuario su cuenta Twitch? */
  connected: boolean;
  /** URL del canal Twitch — para el CTA "Abrir Twitch". */
  channelUrl: string | null;
}

/**
 * Card interactiva para misiones Twitch con verificación real vía OAuth
 * (scope `user:read:follows`). Nunca simula: si el usuario no sigue el
 * canal, `verifyTwitchMission` devuelve `not_verified` y aquí lo
 * mostramos.
 *
 * Estados:
 *   1. Cobrada        → Card en modo "is-done", sin botón.
 *   2. No conectado   → CTA "Conectar Twitch" (redirige a OAuth).
 *   3. Conectado      → CTA doble: "Abrir Twitch" (canal) + "Verificar".
 *   4. Verificando    → Botón bloqueado, texto "Verificando...".
 *   5. Token expirado → CTA "Reconectar Twitch" (mismo endpoint OAuth).
 *   6. Error de API   → Mensaje + botón "Reintentar".
 *
 * Nota importante Fase B: los access tokens Twitch caducan a las ~4h.
 * No guardamos refresh_token — el usuario re-conecta cuando expire.
 */
export function TwitchMissionCard({ mission, connected, channelUrl }: Props) {
  const [uiState, setUiState] = useState<UiState>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  const isDone = mission.claimed;
  const showError = uiState.kind === 'error';
  const isTokenExpired = uiState.kind === 'error' && uiState.code === 'token_expired';

  function onVerifyClick() {
    setUiState({ kind: 'verifying' });
    startTransition(async () => {
      const result = await verifyTwitchMission({ missionId: mission.id });
      if (result.ok) {
        setUiState({ kind: 'idle' });
        return;
      }
      setUiState({ kind: 'error', code: result.code, message: result.message });
    });
  }

  return (
    <div className={`gp-mission-card gp-mission-card-twitch${isDone ? ' is-done' : ''}`}>
      <div className="gp-mission-row">
        <h3 className="gp-mission-title">
          {isDone ? '✓ ' : ''}
          <span className="gp-mission-twitch-tag" aria-hidden>Twitch</span>{' '}
          {mission.title}
        </h3>
        <span className={`gp-mission-reward${isDone ? ' is-done' : ''}`}>
          {isDone ? 'Cobrado' : `+${mission.rewardCoins} ⭐`}
        </span>
      </div>
      <p className="gp-mission-desc">{mission.description}</p>

      {isDone ? null : (
        <div className="gp-mission-twitch-actions">
          {channelUrl ? (
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gp-mission-twitch-btn is-secondary"
            >
              Abrir Twitch
            </a>
          ) : null}

          {connected && !isTokenExpired ? (
            <button
              type="button"
              className="gp-mission-twitch-btn is-primary"
              onClick={onVerifyClick}
              disabled={pending || uiState.kind === 'verifying'}
              aria-busy={pending}
            >
              {pending || uiState.kind === 'verifying' ? 'Verificando...' : 'Verificar misión'}
            </button>
          ) : (
            <Link
              href="/api/auth/social/twitch/connect?return=/sorteos"
              className="gp-mission-twitch-btn is-primary"
              prefetch={false}
            >
              {isTokenExpired ? 'Reconectar Twitch' : 'Conectar Twitch'}
            </Link>
          )}
        </div>
      )}

      {showError ? (
        <div className="gp-mission-twitch-error" role="alert">
          {uiState.message}
        </div>
      ) : null}

      <p className="gp-mission-twitch-note">
        Usaremos Twitch únicamente para verificar tu identidad y si sigues el canal indicado.
        No publicaremos nada en tu nombre.
      </p>
    </div>
  );
}
