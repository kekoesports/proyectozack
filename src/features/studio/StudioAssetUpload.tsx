'use client';
import { useStudioWorkspace } from './StudioWorkspaceContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function StudioAssetUpload({ projectId }: { projectId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const workspace = useStudioWorkspace();
  const router = useRouter();
  return (
    <form
      className="studio-panel studio-form"
      onSubmit={(event) => {
        void (async () => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const file = data.get('file');
          if (
            !(file instanceof File) ||
            !file.size ||
            file.size > 20 * 1024 * 1024
          ) {
            setMessage('Selecciona un archivo de hasta 20 MB.');
            return;
          }
          data.set('name', file.name.slice(0, 160));
          if (projectId) data.set('projectId', projectId);
          if (workspace !== undefined) data.set('workspace', String(workspace));
          setBusy(true);
          setMessage('');
          try {
            const response = await fetch('/api/studio/assets', {
              method: 'POST',
              body: data,
            });
            if (!response.ok) {
              setMessage(
                'No se pudo subir: revisa formato, tamaño, derechos, acceso y cuota de tu biblioteca.',
              );
              return;
            }
            setMessage('Recurso guardado en tu biblioteca privada.');
            form.reset();
            router.refresh();
          } catch {
            setMessage('La subida se interrumpió. Vuelve a intentarlo.');
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <label>
        Añadir material propio
        <input
          type="file"
          name="file"
          required
          accept="image/jpeg,image/png,image/webp,video/mp4,audio/wav,audio/ogg,audio/mpeg"
        />
      </label>
      <small>
        JPG, PNG, WebP, MP4, MP3, WAV u OGG · máximo 20 MB por archivo; 100 recursos
        y 500 MB por creador en este piloto.
      </small>
      <label className="studio-check">
        <input type="checkbox" name="rightsConfirmed" value="true" required />{' '}
        Tengo permiso para usar este material en mi contenido.
      </label>
      <div>
        <button className="studio-secondary" disabled={busy}>
          {busy ? 'Subiendo…' : 'Guardar recurso'}
        </button>
      </div>
      <p role="status">{message}</p>
    </form>
  );
}
