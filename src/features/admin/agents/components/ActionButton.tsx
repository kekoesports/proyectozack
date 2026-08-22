'use client';

import { useState, useTransition, type ReactElement } from 'react';

/**
 * Botón que invoca una Server Action y enseña lo que respondió.
 *
 * Existe porque los errores de este panel importan: "caducó, pide otra" y
 * "tu rol no puede firmar esto" son cosas distintas y quien pulsa necesita
 * saber cuál fue. Un `<form action={...}>` nativo no puede mostrarlas —React
 * exige que la acción devuelva `void`—, así que se invoca dentro de una
 * transición y se pinta el resultado.
 *
 * `confirm` es para lo irreversible. No sustituye a ningún control del
 * servidor: la Server Action revalida permisos y estado en cada envío. Solo
 * evita el clic accidental.
 */

export type AccionResultado =
  | { readonly ok: true; readonly message?: string }
  | { readonly ok: false; readonly error: string };

type Variante = 'neutro' | 'peligro' | 'confirmar';

const ESTILOS: Record<Variante, string> = {
  neutro: 'border-sp-admin-border text-sp-admin-text hover:border-sp-orange',
  peligro: 'border-red-600/50 text-red-400 hover:bg-red-950/30',
  confirmar: 'border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30',
};

export function ActionButton({
  action,
  fields,
  label,
  variant = 'neutro',
  confirm,
  title,
}: {
  readonly action: (formData: FormData) => Promise<AccionResultado>;
  readonly fields: Readonly<Record<string, string | number>>;
  readonly label: string;
  readonly variant?: Variante | undefined;
  /** Texto de confirmación. Solo para acciones que no se pueden deshacer. */
  readonly confirm?: string | undefined;
  readonly title?: string | undefined;
}): ReactElement {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<AccionResultado | null>(null);

  const pulsar = (): void => {
    if (confirm && !window.confirm(confirm)) return;

    setResultado(null);
    startTransition(async () => {
      const datos = new FormData();
      for (const [clave, valor] of Object.entries(fields)) datos.set(clave, String(valor));

      try {
        setResultado(await action(datos));
      } catch {
        // `requirePermission` redirige lanzando: eso no es un fallo que haya
        // que enseñar como error, así que se ignora en silencio y Next navega.
        setResultado({ ok: false, error: 'No se pudo completar la acción.' });
      }
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={pulsar}
        disabled={pendiente}
        title={title}
        className={`rounded border px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${ESTILOS[variant]}`}
      >
        {pendiente ? '…' : label}
      </button>

      {resultado && (
        <span
          className={`text-[10px] ${resultado.ok ? 'text-emerald-400' : 'text-red-400'}`}
          role="status"
        >
          {resultado.ok ? (resultado.message ?? 'Hecho.') : resultado.error}
        </span>
      )}
    </span>
  );
}
