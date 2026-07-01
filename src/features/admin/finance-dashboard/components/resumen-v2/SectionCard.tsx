/**
 * Card contenedor para cada bloque del resumen económico V2.
 * Server Component — sin `'use client'`, sin useState.
 */

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
};

export function SectionCard({ title, subtitle, children }: Props): React.ReactElement {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5"
    >
      <header className="mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[10px] text-sp-admin-muted/70">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}
