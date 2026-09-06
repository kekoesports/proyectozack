'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  inviteStudioCreator,
  reviewStudioContent,
  revokeStudioAccess,
} from '@/app/admin/(dashboard)/studio/actions';

export function StudioInviteForm({
  roster,
}: {
  roster: { id: number; name: string }[];
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        void (async () => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy(true);
          setMessage('');
          try {
            const result = await inviteStudioCreator({
              talentId: data.get('talentId'),
              email: data.get('email'),
            });
            setMessage(
              result.ok
                ? `${window.location.origin}${result.path}`
                : result.error,
            );
          } catch {
            setMessage('No se pudo crear la invitación.');
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <label>
        Talento
        <select name="talentId" required>
          <option value="">Seleccionar</option>
          {roster.map((talent) => (
            <option value={talent.id} key={talent.id}>
              {talent.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Correo invitado
        <input name="email" type="email" required />
      </label>
      <button className="studio-secondary" disabled={busy}>
        {busy ? 'Creando…' : 'Crear enlace de invitación'}
      </button>
      <small>
        Caduca en 48 horas. No se envía ningún correo automáticamente. Comparte
        el enlace solo con su destinatario.
      </small>
      <p className="studio-share-link" role="status">
        {message}
      </p>
    </form>
  );
}

export function StudioReviewForm({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        void (async () => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          setMessage('');
          try {
            const result = await reviewStudioContent({
              id,
              revision,
              decision: form.get('decision'),
              comment: form.get('comment'),
            });
            setMessage(result.ok ? 'Revisión guardada.' : result.error);
            if (result.ok) router.refresh();
          } catch {
            setMessage('No se pudo guardar la revisión.');
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <label>
        Decisión sobre el guion
        <select name="decision">
          <option value="changes_requested">Solicitar cambios</option>
          <option value="approved">Aprobar guion</option>
        </select>
      </label>
      <label>
        Comentario para el creador
        <textarea
          name="comment"
          minLength={3}
          maxLength={2000}
          required
          rows={2}
        />
      </label>
      <button className="studio-secondary" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar revisión'}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

export function StudioRevokeButton({ id }: { id: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div>
      <button
        className="studio-text-button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            if (
              !window.confirm(
                '¿Revocar este acceso? Los proyectos y recursos se conservan.',
              )
            )
              return;
            setBusy(true);
            try {
              const result = await revokeStudioAccess(id);
              if (result.ok) router.refresh();
              else setMessage(result.error);
            } catch {
              setMessage('No se pudo revocar.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Revocar acceso
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
