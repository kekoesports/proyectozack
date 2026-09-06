'use client';
import { useState } from 'react';

export function StudioVerifyEmail({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <div className="studio-form">
      <h2>Verifica tu correo</h2>
      <p>
        Antes de activar la invitación necesitamos confirmar que esta cuenta es
        tuya. Tras verificarla, vuelve a abrir el enlace que te envió SocialPro.
      </p>
      <button
        type="button"
        className="studio-button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setMessage('');
            try {
              const response = await fetch(
                '/api/auth/send-verification-email',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email,
                    callbackURL: '/studio/access',
                  }),
                },
              );
              setMessage(
                response.ok
                  ? 'Si tienes una invitación vigente, recibirás el enlace de verificación. Revisa también spam.'
                  : 'No se pudo solicitar. Espera antes de volver a intentarlo o consulta con SocialPro.',
              );
            } catch {
              setMessage('No se pudo conectar. Vuelve a intentarlo.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Enviar enlace de verificación
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
