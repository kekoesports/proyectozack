'use client';

import { useState, useTransition } from 'react';
import { revokePartnerConsent } from '@/lib/actions/partner-consent-action';

/**
 * Botón client que llama a `revokePartnerConsent`. Usado en
 * `/sorteos/perfil/permisos` para que el usuario retire su consent
 * en cualquier momento.
 *
 * Sin confirmación implícita — dispara acción directa. Si el UX se
 * ve muy áspero se puede añadir un `confirm()` o modal, pero preferimos
 * mantenerlo simple: la acción es reversible (aceptar de nuevo).
 *
 * @kind client
 * @feature giveaway-platform
 */
export function RevokeConsentButton(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await revokePartnerConsent();
            if (!res.ok) setError(res.error);
          });
        }}
        style={{
          padding:       '9px 18px',
          borderRadius:  '999px',
          border:        '1px solid rgba(224,48,112,0.35)',
          background:    'rgba(224,48,112,0.12)',
          color:         '#f5a3bf',
          fontSize:      '12px',
          fontWeight:    700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          cursor:        pending ? 'not-allowed' : 'pointer',
        }}
      >
        {pending ? 'Revocando…' : 'Revocar consentimiento'}
      </button>
      {error ? (
        <p role="alert" style={{ color: '#f5a3bf', fontSize: 12, marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
