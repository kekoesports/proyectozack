'use client';
import { useStudioWorkspace } from './StudioWorkspaceContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StudioProjectInput } from '@/lib/schemas/studio';
import { STUDIO_TEMPLATES, studioTemplate } from '@/lib/studio/templates';
import { saveStudioProject } from '@/app/studio/actions';

type Props = {
  project?: StudioProjectInput & { id: string; revision: number };
};
export function StudioProjectEditor({ project }: Props) {
  const workspace = useStudioWorkspace();
  const router = useRouter();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StudioProjectInput>({
    resolver: zodResolver(StudioProjectInput),
    defaultValues: project ?? {
      title: '',
      template: 'presentation',
      platform: 'tiktok',
      brief: '',
      script: '',
      cta: '',
    },
  });
  const template = studioTemplate(useWatch({ control, name: 'template' }));
  return (
    <form
      className="studio-editor"
      onSubmit={(event) => {
        void handleSubmit(async (data) => {
          setError('');
          try {
            const result = await saveStudioProject(
              project
                ? { ...data, id: project.id, revision: project.revision }
                : data,
              Boolean(project),
              workspace,
            );
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/studio/projects/${result.id}`);
            router.refresh();
          } catch {
            setError(
              'No se pudo guardar. Conserva tu texto y vuelve a intentarlo.',
            );
          }
        })(event);
      }}
    >
      <fieldset className="studio-template-grid">
        <legend className="studio-label">01 / Elige el enfoque</legend>
        {STUDIO_TEMPLATES.map((item) => (
          <label className="studio-template" key={item.id}>
            <input type="radio" value={item.id} {...register('template')} />
            <span className="studio-eyebrow">
              {item.number} / {item.label}
            </span>
            <strong>{item.name}</strong>
            <span>{item.description}</span>
          </label>
        ))}
      </fieldset>
      <div className="studio-editor-columns">
        <div className="studio-panel studio-form">
          <h2>02 / Tu mensaje</h2>
          <label>
            Título
            <input
              {...register('title')}
              placeholder="Ej. Tres decisiones que mejoraron mi juego"
              maxLength={160}
            />
          </label>
          <p className="studio-error">{errors.title?.message}</p>
          <label>
            Red principal
            <select {...register('platform')}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram Reels</option>
              <option value="youtube">YouTube Shorts</option>
            </select>
          </label>
          <label>
            ¿Qué quieres contar y a quién?
            <textarea
              {...register('brief')}
              rows={3}
              placeholder="Objetivo, público y material que tienes…"
            />
          </label>
          <p className="studio-error">{errors.brief?.message}</p>
          <label>
            Guion
            <textarea
              {...register('script')}
              rows={8}
              placeholder="Escribe como hablas. Una idea por párrafo."
            />
          </label>
          <p className="studio-error">{errors.script?.message}</p>
          <label>
            Llamada a la acción
            <input
              {...register('cta')}
              maxLength={200}
              placeholder={template.cta}
            />
          </label>
          <p className="studio-error">{errors.cta?.message}</p>
        </div>
        <aside className="studio-panel studio-guide">
          <p className="studio-eyebrow">UNA ESTRUCTURA, TU VOZ</p>
          <h2>{template.hook}</h2>
          <ol>
            {template.structure.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <button
            type="button"
            className="studio-secondary"
            onClick={() => {
              if (
                  getValues('script').trim() &&
                !window.confirm(
                  '¿Sustituir el guion actual por esta estructura?',
                )
              )
                return;
              setValue('script', template.structure.join('\n\n'), {
                shouldDirty: true,
              });
              setValue('cta', template.cta, { shouldDirty: true });
            }}
          >
            Usar estructura en el guion
          </button>
          <p>
            Es una guía editorial, no una tendencia detectada ni una promesa de
            resultados.
          </p>
          <hr />
          <p>
            <strong>Sin créditos de generación.</strong>
            <br />
            Este paso guarda tu brief y guion. No genera avatar, voz ni publica
            contenido.
          </p>
        </aside>
      </div>
      <div className="studio-form-footer">
        <p role="alert" className="studio-error">
          {error}
        </p>
        <button className="studio-button" disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando…'
            : project
              ? 'Guardar nueva versión'
              : 'Crear proyecto'}
        </button>
      </div>
    </form>
  );
}
