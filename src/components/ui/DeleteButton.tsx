'use client';

type DeleteButtonProps = {
  name: string;
}

/**
 * Botón "Eliminar" con `confirm()` nativo. Pensado para formularios de admin
 * que envían un `<form>` con server action; aborta el submit si el usuario cancela.
 *
 * @kind client
 * @feature ui
 * @example
 * ```tsx
 * <DeleteButton name="este talento" />
 * ```
 */
export function DeleteButton({ name }: DeleteButtonProps) {
  return (
    <button
      type="submit"
      className="text-xs text-red-500 hover:text-red-700 font-medium"
      onClick={(e) => {
        if (!confirm(`¿Eliminar ${name}?`)) e.preventDefault();
      }}
    >
      Eliminar
    </button>
  );
}
