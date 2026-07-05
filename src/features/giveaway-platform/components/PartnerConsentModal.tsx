'use client';

import { useId, useState, useTransition } from 'react';
import { grantPartnerConsent } from '@/lib/actions/partner-consent-action';

/**
 * Trigger client — botón que abre el modal de consent para ver ofertas
 * de partners externos. Renderiza el modal inline (sin portal para
 * simplificar el MVP; migrar a Radix Dialog en Fase 1 si hace falta).
 *
 * Flujo:
 *   1. Usuario hace clic en el botón.
 *   2. Modal muestra 3 checkboxes obligatorios: +18, participación
 *      responsable, ver contenido de partners externos.
 *   3. Al aceptar, llama a `grantPartnerConsent` (server action) que
 *      escribe la cookie `sp_partner_consent` y revalida la ruta.
 *
 * @kind client
 * @feature giveaway-platform
 */
export function PartnerConsentModalTrigger(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            '8px',
          padding:        '10px 20px',
          borderRadius:   '999px',
          border:         '1px solid rgba(255,255,255,0.18)',
          background:     'linear-gradient(135deg, rgba(245,99,42,0.85), rgba(139,58,173,0.85))',
          color:          '#fff',
          fontWeight:     700,
          fontSize:       '13px',
          letterSpacing:  '0.05em',
          textTransform:  'uppercase',
          cursor:         'pointer',
        }}
      >
        Confirmar y ver ofertas
      </button>
      {open ? <PartnerConsentModalDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PartnerConsentModalDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const id = useId();
  const [age18, setAge18] = useState(false);
  const [responsible, setResponsible] = useState(false);
  const [externalPartners, setExternalPartners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allChecked = age18 && responsible && externalPartners;

  function handleSubmit(): void {
    if (!allChecked) {
      setError('Debes aceptar los 3 puntos antes de continuar.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await grantPartnerConsent({ age18, responsible, externalPartners });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px',
        background:     'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   '#0f0f13',
          border:       '1px solid rgba(255,255,255,0.12)',
          borderRadius: '18px',
          padding:      '28px',
          maxWidth:     '480px',
          width:        '100%',
          color:        '#fff',
          boxShadow:    '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.24em',
            fontSize:      '10px',
            fontWeight:    700,
            color:         'rgba(245,99,42,0.85)',
            margin:        '0 0 6px 0',
          }}
        >
          Ofertas de partners externos
        </p>
        <h2
          id={`${id}-title`}
          style={{
            fontSize:   '22px',
            fontWeight: 800,
            margin:     '0 0 12px 0',
          }}
        >
          Confirma que has leído y aceptas
        </h2>
        <p
          style={{
            fontSize:   '13px',
            lineHeight: 1.55,
            margin:     '0 0 18px 0',
            color:      'rgba(255,255,255,0.65)',
          }}
        >
          Para mostrarte las ofertas y códigos de partners externos necesitamos que confirmes
          las siguientes condiciones. Puedes revocar este consentimiento en cualquier momento.
        </p>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 18px 0' }}>
          <legend className="sr-only">Condiciones para ver contenido de partners externos</legend>
          <ConsentCheckbox
            id={`${id}-age18`}
            checked={age18}
            onChange={setAge18}
            label={<>Soy mayor de <b>18 años</b>.</>}
          />
          <ConsentCheckbox
            id={`${id}-responsible`}
            checked={responsible}
            onChange={setResponsible}
            label={
              <>
                He leído la página de{' '}
                <a
                  href="/sorteos/participacion-responsable"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}
                >
                  participación responsable
                </a>
                {' '}y participo de forma responsable.
              </>
            }
          />
          <ConsentCheckbox
            id={`${id}-partners`}
            checked={externalPartners}
            onChange={setExternalPartners}
            label={
              <>
                Entiendo que los partners externos (KeyDrop, SkinsMonkey, CSGO-SKINS,
                Skin.Club) son <b>plataformas independientes</b> y que sus condiciones,
                promociones y operativa no son responsabilidad de SocialPro.
              </>
            }
          />
        </fieldset>

        {error ? (
          <p
            role="alert"
            style={{
              margin:     '0 0 12px 0',
              padding:    '10px 12px',
              borderRadius: '10px',
              background: 'rgba(224,48,112,0.12)',
              border:     '1px solid rgba(224,48,112,0.35)',
              color:      '#f5a3bf',
              fontSize:   '12px',
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding:      '9px 16px',
              borderRadius: '999px',
              border:       '1px solid rgba(255,255,255,0.14)',
              background:   'transparent',
              color:        'rgba(255,255,255,0.75)',
              fontSize:     '12px',
              fontWeight:   700,
              cursor:       pending ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allChecked || pending}
            style={{
              padding:      '9px 20px',
              borderRadius: '999px',
              border:       '1px solid rgba(255,255,255,0.18)',
              background:   allChecked
                ? 'linear-gradient(135deg, rgba(245,99,42,0.9), rgba(139,58,173,0.9))'
                : 'rgba(255,255,255,0.08)',
              color:        allChecked ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize:     '12px',
              fontWeight:   700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor:       (!allChecked || pending) ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Guardando…' : 'Aceptar y continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  id, checked, onChange, label,
}: {
  id:       string;
  checked:  boolean;
  onChange: (v: boolean) => void;
  label:    React.ReactNode;
}): React.JSX.Element {
  return (
    <label
      htmlFor={id}
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '10px',
        padding:      '10px 12px',
        margin:       '0 0 8px 0',
        borderRadius: '10px',
        border:       `1px solid ${checked ? 'rgba(245,99,42,0.35)' : 'rgba(255,255,255,0.08)'}`,
        background:   checked ? 'rgba(245,99,42,0.06)' : 'rgba(255,255,255,0.02)',
        cursor:       'pointer',
        fontSize:     '13px',
        lineHeight:   1.45,
        color:        'rgba(255,255,255,0.85)',
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '3px', flexShrink: 0 }}
      />
      <span>{label}</span>
    </label>
  );
}
