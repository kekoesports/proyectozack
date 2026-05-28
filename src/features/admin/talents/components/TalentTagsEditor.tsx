'use client';

import { useActionState, useRef } from 'react';
import { addTalentTagAction, removeTalentTagAction } from '@/app/admin/(dashboard)/talents/actions';

type Tag = { id: number; tag: string };

type Props = {
  readonly talentId: number;
  readonly initialTags: Tag[];
};

const REMOVE_INIT = { success: false } as const;
const ADD_INIT    = { success: false } as const;

export function TalentTagsEditor({ talentId, initialTags }: Props): React.JSX.Element {
  const [addState, addAction, addPending]       = useActionState(addTalentTagAction, ADD_INIT);
  const [removeState, removeAction, removePending] = useActionState(removeTalentTagAction, REMOVE_INIT);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = addState.error ?? removeState.error;
  const isPending = addPending || removePending;

  return (
    <section className="space-y-3">
      {/* Etiquetas actuales */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {initialTags.length === 0 && (
          <span className="text-xs text-sp-admin-muted italic">Sin etiquetas</span>
        )}
        {initialTags.map((t) => (
          <form key={t.id} action={removeAction}>
            <input type="hidden" name="tagId"    value={t.id} />
            <input type="hidden" name="talentId" value={talentId} />
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sp-admin-border/50 text-sp-admin-muted hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.tag}
              <span className="text-[10px] leading-none">✕</span>
            </button>
          </form>
        ))}
      </div>

      {/* Añadir etiqueta */}
      <form
        action={addAction}
        onSubmit={() => {
          // Limpiar input tras envío
          setTimeout(() => { if (inputRef.current) inputRef.current.value = ''; }, 50);
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="talentId" value={talentId} />
        <input
          ref={inputRef}
          name="tag"
          type="text"
          placeholder="Nueva etiqueta…"
          maxLength={100}
          disabled={isPending}
          className="flex-1 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Añadir
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </section>
  );
}
