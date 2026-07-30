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

  const isDone = mission.claimed;
  const showError = uiState.kind === 'error';
  const showSuccess = uiState.kind === 'success';
  const returnPath = creatorSlug ? `/sorteos/${creatorSlug}` : '/sorteos';

  // Feedback tras OAuth Discord (?discord_status=...&coins=...).
  useEffect(() => {
    const status = searchParams.get('discord_status');
    if (!status) return;
    if (status === 'rewarded') {
      const coins = searchParams.get('coins') ?? String(mission.rewardCoins);
      setUiState({
        kind: 'success',
        message: `¡+${coins} puntos! Misión Discord completada.`,
      });
      router.refresh();
    } else if (status === 'connected_join_server') {
      setUiState({
        kind: 'error',
        code: 'not_verified',
        message: 'Discord conectado. Ahora únete al servidor con "Abrir Discord" y pulsa "Verificar misión".',
      });
    } else if (status === 'account_in_use') {
      setUiState({
        kind: 'error',
        code: 'internal',
        message: 'Esa cuenta de Discord ya está vinculada a otro usuario de SocialPro.',
      });
    } else if (status === 'encrypt_failed' || status === 'discord_not_configured') {
      setUiState({
        kind: 'error',
        code: 'internal',
        message: 'No hemos podido guardar la conexión Discord. Inténtalo de nuevo más tarde.',
      });
    }
  }, [searchParams, mission.rewardCoins, router]);

  function onVerifyClick() {
    setUiState({ kind: 'verifying' });
    startTransition(async () => {
      const result = await verifyDiscordMission({ missionId: mission.id });
      if (result.ok) {
        setUiState({
          kind: 'success',
          message: `¡+${result.rewardCoins} puntos! Misión completada.`,
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
      <p className="gp-mission-desc">{mission.description}</p>

      {isDone ? null : (
        <>
          {connected && !showError ? (
            <p className="gp-mission-discord-hint">
              Entra al servidor y después verifica la misión.
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
                disabled={pending || uiState.kind === 'verifying'}
                aria-busy={pending}
              >
                {pending || uiState.kind === 'verifying' ? 'Verificando...' : 'Verificar misión'}
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

      {showSuccess ? (
        <div className="gp-mission-discord-success" role="status">
          {uiState.message}
        </div>
      ) : null}

      {showError ? (
        <div className="gp-mission-discord-error" role="alert">
          {uiState.message}
        </div>
      ) : null}

      <p className="gp-mission-discord-note">
        Pasos: 1) Abrir Discord y unirte al servidor · 2) Conectar Discord · 3) Verificar misión.
        Solo comprobamos que estás dentro del servidor del creador. No leemos mensajes ni
        guardamos la lista completa de tus servidores.
      </p>
    </div>
  );
}
