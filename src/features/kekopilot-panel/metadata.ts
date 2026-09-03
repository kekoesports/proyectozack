import type { Metadata } from 'next';
import type { KekoPilotPanelConfig } from './data';

type PanelMetadataPage = 'login' | 'panel';

export function createKekoPilotPanelMetadata(
  panelConfig: KekoPilotPanelConfig,
  page: PanelMetadataPage,
): Metadata {
  const { branding, workspace } = panelConfig;
  const metadataBase = new URL(branding.appUrl);
  const isLogin = page === 'login';
  const canonical = new URL(isLogin ? '/login' : '/', metadataBase);
  const title = isLogin
    ? `Acceso · ${branding.productName}`
    : `Command Center · ${branding.productName}`;
  const description = isLogin
    ? `Acceso privado al Command Center de ${workspace.name}.`
    : `Panel operativo de ${workspace.name} para revisar decisiones, bloqueos, agentes y automatizaciones.`;

  return {
    title: { absolute: title },
    description,
    applicationName: branding.productName,
    metadataBase,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: branding.productName,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: false, follow: false, noarchive: true },
    icons: {
      icon: [{ url: branding.logoPath ?? '/kekopilot/icon.svg' }],
    },
    manifest: null,
  };
}
