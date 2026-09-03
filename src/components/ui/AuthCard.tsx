import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { PanelBranding } from '@/features/kekopilot-panel/data';

type AuthCardStyle = CSSProperties & {
  readonly '--color-sp-admin-accent'?: string;
};

export default function AuthCard({
  subtitle,
  backHref,
  backLabel,
  brand = 'socialpro',
  panelBranding,
  children,
}: {
  subtitle: string;
  backHref: string;
  backLabel: string;
  brand?: 'socialpro' | 'kekopilot';
  panelBranding?: PanelBranding;
  children: React.ReactNode;
}): React.ReactElement {
  const isKekoPilot = brand === 'kekopilot';
  const brandStyle: AuthCardStyle | undefined = isKekoPilot && panelBranding
    ? { '--color-sp-admin-accent': panelBranding.accentColor }
    : undefined;

  return (
    <div className="min-h-screen bg-sp-admin-bg flex items-center justify-center p-4" style={brandStyle}>
      <div className="w-full max-w-sm bg-sp-admin-card border border-sp-admin-border rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          {isKekoPilot ? (
            <span className="inline-flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-sp-admin-text">
              {panelBranding?.logoPath ? (
                <Image alt="" height={32} src={panelBranding.logoPath} width={32} />
              ) : (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-md text-xs"
                  style={{
                    backgroundColor: panelBranding?.accentColor ?? '#ffb020',
                    color: panelBranding?.accentTextColor ?? '#111515',
                  }}
                >
                  {panelBranding?.productInitials ?? 'KP'}
                </span>
              )}
              <span>{panelBranding?.productName ?? 'KekoPilot'}</span>
            </span>
          ) : (
            <span className="font-display text-2xl font-black uppercase gradient-text">SocialPro</span>
          )}
          <p className="text-sm text-sp-admin-muted mt-1">{subtitle}</p>
        </div>

        {children}

        <p className="mt-6 text-center text-xs text-sp-admin-muted">
          <a href={backHref} className="hover:text-sp-admin-text transition-colors">
            {backLabel}
          </a>
        </p>
      </div>
    </div>
  );
}
