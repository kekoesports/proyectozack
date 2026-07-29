'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirmAdultStatus } from '@/app/sorteos/plataforma/actions';

export function AdultAttestationCard(): React.ReactElement {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(): void {
    setError(null);
    startTransition(async () => {
      const result = await confirmAdultStatus({ confirmed });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section aria-labelledby="adult-attestation-title">
      <div className="gp-legacy-block" style={{ borderColor: 'rgba(245,99,42,0.35)' }}>
        <h2 id="adult-attestation-title">Confirma tu edad</h2>
        <p className="gp-mission-head">
          Debes ser mayor de 18 años para participar y canjear recompensas.
        </p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            Confirmo que soy mayor de <b>18 años</b> y he leído la información de{' '}
            <Link href="/sorteos/participacion-responsable">participación responsable</Link>.
          </span>
        </label>
        {error ? <p role="alert" className="gp-shop-error">{error}</p> : null}
        <button
          type="button"
          className="gp-social-btn gp-social-btn-primary"
          disabled={!confirmed || pending}
          onClick={submit}
        >
          {pending ? 'Guardando…' : 'Confirmar +18'}
        </button>
      </div>
    </section>
  );
}
