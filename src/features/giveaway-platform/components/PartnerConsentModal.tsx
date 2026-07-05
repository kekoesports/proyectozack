'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { grantPartnerConsent } from '@/lib/actions/partner-consent-action';

/**
 * Trigger + modal Radix Dialog para el consent de partners externos.
 *
 * Fase 1: sustituye a la implementación DIY previa por Radix Dialog para
 * conseguir focus trap correcto, cierre por Escape, portal fuera del
 * árbol del server component y aria-labelledby/-describedby coherentes.
 *
 * Flujo:
 *   1. Usuario hace clic en el trigger.
 *   2. Modal muestra 3 checkboxes obligatorios: +18, participación
 *      responsable, ver contenido de partners externos.
 *   3. Al aceptar, llama a `grantPartnerConsent` (server action) que
 *      escribe en `user_partner_consents` + sincroniza cookie y
 *      revalida las rutas afectadas.
 *
 * @kind client
 * @feature giveaway-platform
 */
export function PartnerConsentModalTrigger(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
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
      </Dialog.Trigger>
      <PartnerConsentModalContent onClose={() => setOpen(false)} />
    </Dialog.Root>
  );
}

function PartnerConsentModalContent({ onClose }: { onClose: () => void }): React.JSX.Element {
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
    <Dialog.Portal>
      <Dialog.Overlay
        style={{
          position:       'fixed',
          inset:          0,
          zIndex:         1000,
          background:     'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <Dialog.Content
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        style={{
          position:      'fixed',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          zIndex:        1001,
          background:    '#0f0f13',
          border:        '1px solid rgba(255,255,255,0.12)',
          borderRadius:  '18px',
          padding:       '28px',
          maxWidth:      '480px',
          width:         'calc(100vw - 48px)',
          maxHeight:     'calc(100vh - 48px)',
          overflowY:     'auto',
          color:         '#fff',
          boxShadow:     '0 20px 60px rgba(0,0,0,0.6)',
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
        <Dialog.Title asChild>
          <h2
            id={`${id}-title`}
            style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}
          >
            Confirma que has leído y aceptas
          </h2>
        </Dialog.Title>
        <Dialog.Description asChild>
          <p
            id={`${id}-desc`}
            style={{
              fontSize:   '13px',
              lineHeight: 1.55,
              margin:     '0 0 18px 0',
              color:      'rgba(255,255,255,0.65)',
            }}
          >
            Para mostrarte las ofertas y códigos de partners externos necesitamos que confirmes
            las siguientes condiciones. Puedes revocar este consentimiento en cualquier momento
            desde <Link href="/sorteos/perfil/permisos" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}>Mis permisos</Link>.
          </p>
        </Dialog.Description>

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
              margin:       '0 0 12px 0',
              padding:      '10px 12px',
              borderRadius: '10px',
              background:   'rgba(224,48,112,0.12)',
              border:       '1px solid rgba(224,48,112,0.35)',
              color:        '#f5a3bf',
              fontSize:     '12px',
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Dialog.Close asChild>
            <button
              type="button"
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
          </Dialog.Close>
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
              color:         allChecked ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize:      '12px',
              fontWeight:    700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor:        (!allChecked || pending) ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Guardando…' : 'Aceptar y continuar'}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
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
