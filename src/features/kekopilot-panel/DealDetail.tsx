import Link from 'next/link';
import type { DealDetailData } from './data';
import styles from './product.module.css';

type DealDetailProps = { readonly detail: DealDetailData; readonly workspaceName: string };

export function DealDetail({ detail, workspaceName }: DealDetailProps) {
  const { deal } = detail;
  const completed = detail.deliverables.filter((item) => item.done).length;

  return (
    <div className={styles.dealDetail}>
      <header className={styles.dealHero}>
        <div>
          <span>{deal.ref} · <i data-tone={deal.tone}>{deal.state}</i> · {detail.stage}</span>
          <h2>{deal.creator}</h2>
          <p>{deal.brand} · {deal.name}</p>
        </div>
        <dl>
          <div><dt>Importe</dt><dd>{deal.amount}</dd></div>
          <div><dt>Margen</dt><dd>{deal.margin}</dd></div>
          <div><dt>Responsable</dt><dd>{deal.owner}</dd></div>
          <div><dt>Progreso</dt><dd>{deal.progress}%</dd></div>
        </dl>
        <Link className={styles.crmLink} href={detail.crmHref}>Abrir ficha completa en {workspaceName}</Link>
      </header>

      <div className={styles.dealColumns}>
        <div>
          <DealSection title="Entregables" meta={`${completed} de ${detail.deliverables.length} aprobados`}>
            {detail.deliverables.map((item) => (
              <article className={styles.deliverableRow} key={item.id}>
                <i data-done={item.done ? 'true' : undefined}>{item.done ? '✓' : '○'}</i>
                <div><strong>{item.title}</strong><span>{item.body}</span></div>
                <time>{item.date}</time><small>{item.state}</small>
              </article>
            ))}
            {detail.deliverables.length === 0 ? <p className={styles.detailEmpty}>No hay entregables registrados en {workspaceName}.</p> : null}
          </DealSection>

          <DealSection title="Documentos y facturas" meta="evidencia vinculada">
            {detail.documents.map((item) => {
              const external = item.href.startsWith('http');
              return (
                <article className={styles.documentRow} key={item.id}>
                  <div><strong>{item.title}</strong><span>{item.meta}</span></div>
                  <small data-tone={item.attention ? 'attention' : 'neutral'}>{item.state}</small>
                  <a href={item.href} rel={external ? 'noreferrer' : undefined} target={external ? '_blank' : undefined}>Abrir</a>
                </article>
              );
            })}
            {detail.documents.length === 0 ? <p className={styles.detailEmpty}>No hay documentos visibles para tu rol.</p> : null}
          </DealSection>
        </div>

        <aside>
          <DealSection title="Alertas" meta={`${detail.alerts.length} activas`}>
            {detail.alerts.map((item) => (
              <article className={styles.alertRow} data-tone={item.tone} key={item.id}><strong>{item.title}</strong><span>{item.body}</span></article>
            ))}
            {detail.alerts.length === 0 ? <p className={styles.detailEmpty}>Sin alertas activas.</p> : null}
          </DealSection>
          <DealSection title="Actividad" meta="con evidencia">
            {detail.activity.map((item) => (
              <article className={styles.agentRow} key={item.id}>
                <div><i data-tone={item.tone}>{item.kind}</i><small>{item.source}</small><time>{item.when}</time></div>
                <p>{item.text}</p><span>Evidencia · {item.evidence}</span>
              </article>
            ))}
          </DealSection>
        </aside>
      </div>
    </div>
  );
}

function DealSection({ children, meta, title }: { readonly children: React.ReactNode; readonly meta: string; readonly title: string }) {
  return (
    <section className={styles.dealSection}>
      <header><h3>{title}</h3><span>{meta}</span></header>
      {children}
    </section>
  );
}
