import Link from 'next/link';

type EmptyStateProps = {
  message: string;
  actionLabel: string;
  actionHref: string;
}

/**
 * Empty state simple del portal de marcas con mensaje y CTA opcional.
 *
 * @kind server
 * @feature brand-portal
 * @route /marcas/talentos
 * @example
 * ```tsx
 * <EmptyState message="No hay talents" actionLabel="Volver" actionHref="/marcas" />
 * ```
 */
export function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-sp-grad opacity-20 mb-4" />
      <p className="text-sp-muted text-sm mb-4">{message}</p>
      <Link
        href={actionHref}
        className="inline-block px-6 py-2.5 rounded-full text-sm font-bold text-white bg-sp-grad hover:opacity-90 transition-opacity"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
