'use client';

import { useEffect, useState } from 'react';

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  enteredAt: string; // ISO tras serialización desde Server Action
}

interface Props {
  raffleId: number;
  totalCount: number;
  onClose: () => void;
}

const PAGE_SIZE = 20;

/**
 * Modal con paginación server-driven. Los participantes vienen de
 * `/api/sorteos/participants/[raffleId]` que respeta `player_profiles.isPrivate`
 * y jamás expone email/tradeUrl/steamId/IP.
 */
export function ParticipantsModal({ raffleId, totalCount, onClose }: Props): React.ReactElement {
  const [rows, setRows] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/sorteos/participants/${raffleId}?limit=${PAGE_SIZE}&offset=${offset}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { participants: Participant[] }) => {
        if (cancelled) return;
        setRows((prev) => offset === 0 ? data.participants : [...prev, ...data.participants]);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [raffleId, offset]);

  const hasMore = rows.length < totalCount;

  return (
    <div
      className="gp-participants-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Participantes del sorteo"
      onClick={onClose}
    >
      <div className="gp-participants-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gp-participants-header">
          <h3 className="gp-participants-title">Participantes</h3>
          <button
            type="button"
            className="gp-participants-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="gp-participants-total">
          {totalCount.toLocaleString('es-ES')} participante{totalCount === 1 ? '' : 's'} en total
        </p>

        {error ? (
          <p style={{ color: '#ef4444', fontSize: 12 }}>Error cargando participantes: {error}</p>
        ) : (
          <div className="gp-participants-list">
            {rows.map((p) => (
              <div key={p.userId} className="gp-participants-row">
                <div className="gp-participants-avatar">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" />
                  ) : (
                    <span>{p.displayName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <span className="gp-participants-nick">{p.displayName}</span>
                <span className="gp-participants-date">
                  {new Date(p.enteredAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Cargando…</p>
        ) : null}

        {hasMore && !loading ? (
          <button
            type="button"
            className="gp-participants-more"
            onClick={() => setOffset(rows.length)}
          >
            Cargar más ({(totalCount - rows.length).toLocaleString('es-ES')} restantes)
          </button>
        ) : null}
      </div>
    </div>
  );
}
