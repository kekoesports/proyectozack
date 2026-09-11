'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listQuickNotesAction } from '@/app/admin/(dashboard)/notas/actions';
import { QuickNotePanel } from './QuickNotePanel';
import { DeleteNoteButton } from './DeleteNoteButton';

/** Compact personal post-it in the header; expanding is explicit and never covers the workspace by default. */
export function QuickNotesDock({ userId, role }: { userId: string; role: string }) {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: ['quick-notes', 'dock', userId],
    queryFn: async () => {
      const result = await listQuickNotesAction({ view: 'mine', archived: false });
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const notes = query.data ?? [];
  return (
    <aside aria-label="Mis notas rápidas" className="relative z-40 m-2 ml-auto w-60 max-w-[calc(100vw-1rem)] shrink-0 rounded-lg rounded-tr-none border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 shadow-sm">
      <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-b border-l border-amber-300 bg-amber-100" />
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="text-xs font-semibold">Mis notas ({notes.length}) {expanded ? '▴' : '▾'}</button>
        <QuickNotePanel userId={userId} role={role} />
      </div>
      <p className="mt-1 truncate text-xs text-amber-900/80">{query.isError ? 'No se pudieron cargar las notas.' : notes[0]?.note.body ?? 'Apunta algo sin salir de aquí.'}</p>
      {expanded && <div className="absolute right-0 top-full mt-1 w-full space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg">
        {notes.slice(0, 3).map(({ note }) => <article key={note.id} className="space-y-2 rounded border border-amber-200 bg-amber-100/70 p-2 text-sm"><p className="line-clamp-4 whitespace-pre-wrap break-words">{note.body}</p><DeleteNoteButton note={note} role={role} /></article>)}
        <Link className="block text-xs font-semibold underline" onClick={() => setExpanded(false)} href="/admin/notas">Ver todas mis notas</Link>
        <button type="button" className="text-xs underline" onClick={() => setExpanded(false)}>Minimizar</button>
      </div>}
    </aside>
  );
}
