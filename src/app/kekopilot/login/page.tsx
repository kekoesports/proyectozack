import type { Metadata, Viewport } from 'next';
import { StaffLogin } from '@/app/admin/login/page';
import { getKekoPilotPanelConfig } from '@/lib/kekopilot-panel-config';

export function generateMetadata(): Metadata {
  const panelConfig = getKekoPilotPanelConfig();
  return {
    title: { absolute: `Acceso · ${panelConfig.branding.productName}` },
    description: `Acceso privado al Command Center de ${panelConfig.workspace.name}.`,
    robots: { index: false, follow: false },
    icons: panelConfig.branding.logoPath
      ? { icon: [{ url: panelConfig.branding.logoPath }] }
      : undefined,
  };
}

export const viewport: Viewport = { themeColor: '#0b1113' };

export default function KekoPilotLoginPage(): React.ReactElement {
  const panelConfig = getKekoPilotPanelConfig();
  return <StaffLogin panelBranding={panelConfig.branding} variant="kekopilot" />;
}
