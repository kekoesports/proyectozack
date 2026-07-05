import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { giveawayAuditEvents } from '@/db/schema';
import {
  CURRENT_CONSENT_VERSION,
  getActiveConsent,
  getConsentHistory,
} from '@/lib/queries/partnerConsent';
import { RevokeConsentButton } from '@/features/giveaway-platform/components/RevokeConsentButton';

export const metadata: Metadata = {
  title: 'Permisos · SocialPro Sorteos',
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Madrid',
});

const ACTION_LABEL: Record<string, string> = {
  partner_consent_granted: 'Aceptaste ver ofertas de partners',
  partner_consent_revoked: 'Revocaste el consent de partners',
  giveaway_participate:    'Participaste en un sorteo',
  shop_redeem:             'Canjeaste un item de tienda',
  mission_claim:           'Completaste una misión',
  streak_claim:            'Reclamaste tu racha diaria',
  mission_verify:          'Verificación de misión',
};

export default async function PermisosPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id ?? null;
  if (!userId) {
    redirect('/sorteos');
  }

  const [activeConsent, history, events] = await Promise.all([
    getActiveConsent(userId),
    getConsentHistory(userId, 20),
    db
      .select({
        id: giveawayAuditEvents.id,
        action: giveawayAuditEvents.action,
        outcome: giveawayAuditEvents.outcome,
        refType: giveawayAuditEvents.refType,
        refId: giveawayAuditEvents.refId,
        createdAt: giveawayAuditEvents.createdAt,
      })
      .from(giveawayAuditEvents)
      .where(eq(giveawayAuditEvents.userId, userId))
      .orderBy(desc(giveawayAuditEvents.createdAt))
      .limit(30),
  ]);

  return (
    <div className="giveaway-platform">
      <main className="gp-legal-wrap">
        <header className="gp-legal-header">
          <p className="gp-legal-eyebrow">SocialPro Sorteos</p>
          <h1>Mis permisos</h1>
          <p className="gp-legal-sub">
            Estado de tu consentimiento para ver ofertas de partners externos y últimas
            acciones registradas en tu cuenta. Ver también{' '}
            <Link href="/sorteos/partners-externos">Partners externos</Link> y{' '}
            <Link href="/sorteos/participacion-responsable">Participación responsable</Link>.
          </p>
        </header>

        <section className="gp-legal-section">
          <h2>Ofertas de partners externos</h2>
          {activeConsent ? (
            <>
              <p>
                <b>Consentimiento activo</b> (versión <code>{activeConsent.consentVersion}</code>).
                Aceptado el <b>{dateFmt.format(activeConsent.grantedAt)}</b>.
              </p>
              <p>
                Puedes revocarlo en cualquier momento. Al revocarlo dejarás de ver las
                cards de KeyDrop, SkinsMonkey y otros partners externos hasta que vuelvas
                a aceptar.
              </p>
              <RevokeConsentButton />
            </>
          ) : (
            <>
              <p>
                <b>No has aceptado</b> ver ofertas de partners externos en esta versión
                ({CURRENT_CONSENT_VERSION}). Ve a la ficha de un creador para aceptar y
                empezar a ver códigos y ofertas.
              </p>
              <p>
                <Link href="/sorteos" style={{ color: '#f5632a', textDecoration: 'underline' }}>
                  Volver a SocialPro Sorteos
                </Link>
              </p>
            </>
          )}
        </section>

        {history.length > 0 ? (
          <section className="gp-legal-section">
            <h2>Historial de consentimiento</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Versión</th>
                  <th style={{ padding: '8px 4px' }}>Aceptado</th>
                  <th style={{ padding: '8px 4px' }}>Revocado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 4px' }}><code>{h.consentVersion}</code></td>
                    <td style={{ padding: '8px 4px' }}>{dateFmt.format(h.grantedAt)}</td>
                    <td style={{ padding: '8px 4px', color: h.revokedAt ? '#f5a3bf' : 'rgba(255,255,255,0.4)' }}>
                      {h.revokedAt ? dateFmt.format(h.revokedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="gp-legal-section">
          <h2>Actividad reciente</h2>
          {events.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Aún no hay actividad registrada.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map((e) => (
                <li key={e.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  fontSize: 13,
                }}>
                  <span>
                    <b>{ACTION_LABEL[e.action] ?? e.action}</b>
                    {e.refType ? (
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {' · '}{e.refType}{e.refId ? ` #${e.refId}` : ''}
                      </span>
                    ) : null}
                    {e.outcome !== 'success' ? (
                      <span style={{ color: '#f5a3bf' }}>{' · '}{e.outcome}</span>
                    ) : null}
                  </span>
                  <time style={{ color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                    {dateFmt.format(e.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ marginTop: 32 }}>
          <Link href="/sorteos/perfil" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>
            ← Volver a mi perfil
          </Link>
        </p>
      </main>
    </div>
  );
}
