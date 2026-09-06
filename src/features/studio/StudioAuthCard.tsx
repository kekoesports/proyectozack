import Link from 'next/link';

export function StudioAuthCard({ subtitle, backHref, backLabel, children }: { subtitle: string; backHref: string; backLabel: string; children: React.ReactNode }) {
  return <div className="studio-login"><section className="studio-login-card studio-auth-card"><p className="studio-wordmark">SOCIAL<span>PRO</span><small>CREATOR STUDIO</small></p><h1>{subtitle}</h1>{children}<Link href={backHref}>{backLabel}</Link></section></div>;
}
