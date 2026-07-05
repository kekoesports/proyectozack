'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { MissionWithProgress } from '@/types/giveawayPlatform';
import { verifyDiscordMission } from '@/app/sorteos/plataforma/discord-mission-action';

type UiState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'error'; code: string; message: string };

interface Props {
  mission: MissionWithProgress;
  /** ¿Ha conectado el usuario su cuenta Discord? */
  connected: boolean;
  /** URL de invite pública de la guild — solo para el CTA "Abrir Discord". */
  inviteUrl: string | null;
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
export function DiscordMissionCard({ mission, connected, inviteUrl }: Props) {
  const [uiState, setUiState] = useState<UiState>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  const isDone = mission.claimed;
  const showError = uiState.kind === 'error';

  function onVerifyClick() {
    setUiState({ kind: 'verifying' });
    startTransition(async () => {
      const result = await verifyDiscordMission({ missionId: mission.id });
      if (result.ok) {
        // El revalidatePath del server action refresca los datos servidor.
        setUiState({ kind: 'idle' });
        return;
      }
      setUiState({ kind: 'error', code: result.code, message: result.message });
    });
  }

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
      <p className="gp-mission-desc">{mission.description}</p>

      {isDone ? null : (
        <div className="gp-mission-discord-actions">
          {connected ? (
            <>
              {inviteUrl ? (
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gp-mission-discord-btn is-secondary"
                >
                  Abrir Discord
                </a>
              ) : null}
              <button
                type="button"
                className="gp-mission-discord-btn is-primary"
                onClick={onVerifyClick}
                disabled={pending || uiState.kind === 'verifying'}
                aria-busy={pending}
              >
                {pending || uiState.kind === 'verifying' ? 'Verificando...' : 'Verificar misión'}
              </button>
            </>
          ) : (
            <>
              {inviteUrl ? (
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gp-mission-discord-btn is-secondary"
                >
                  Abrir Discord
                </a>
              ) : null}
              <Link
                href="/api/auth/social/discord/connect?return=/sorteos"
                className="gp-mission-discord-btn is-primary"
                prefetch={false}
              >
                Conectar Discord
              </Link>
            </>
          )}
        </div>
      )}

      {showError ? (
        <div className="gp-mission-discord-error" role="alert">
          {uiState.message}
        </div>
      ) : null}

      <p className="gp-mission-discord-note">
        Solo comprobamos que estás dentro del servidor Discord del creador. No leemos mensajes ni
        guardamos la lista completa de tus servidores.
      </p>
    </div>
  );
}
