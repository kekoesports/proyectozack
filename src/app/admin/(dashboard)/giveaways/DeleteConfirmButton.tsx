'use client';

import { useState, useTransition, useRef } from 'react';

type Props = {
  /** Server Action que se llama al confirmar */
  action: (formData: FormData) => Promise<void>;
  /** Hidden fields que se pasan al action */
  fields: Record<string, string | number>;
  /** Texto del item que se va a eliminar (para el mensaje de confirmación) */
  label?: string;
};

/**
 * Botón de eliminación con doble confirmación inline.
 * Clic 1 → muestra "¿Seguro? [Sí] [No]"
 * Clic en "Sí" → ejecuta el server action
 * Clic en "No" o blur → vuelve al estado inicial
 */
export function DeleteConfirmButton({ action, fields, label }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLSpanElement>(null);

  const handleConfirm = () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      fd.set(k, String(v));
    }
    startTransition(async () => {
      await action(fd);
      setConfirming(false);
    });
  };

  if (isPending) {
    return <span className="text-xs text-sp-admin-muted animate-pulse">Eliminando…</span>;
  }

  if (confirming) {
    return (
      <span ref={containerRef} className="inline-flex items-center gap-1.5">
        <span className="text-[10px] text-white/50 whitespace-nowrap">
          {label ? `¿Eliminar "${label}"?` : '¿Eliminar?'}
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-black hover:bg-red-400 transition-colors"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2 py-0.5 rounded bg-sp-admin-border text-sp-admin-muted text-[10px] font-semibold hover:bg-sp-admin-hover transition-colors"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
    >
      Eliminar
    </button>
  );
}
