import type { Metadata, Viewport } from 'next';
import { StaffLogin } from '@/app/admin/login/page';
import { createKekoPilotPanelMetadata } from '@/features/kekopilot-panel/metadata';
import { getKekoPilotPanelConfig } from '@/lib/kekopilot-panel-config';

export function generateMetadata(): Metadata {
  return createKekoPilotPanelMetadata(getKekoPilotPanelConfig(), 'login');
}

export const viewport: Viewport = { themeColor: '#0b1113' };

export default function KekoPilotLoginPage(): React.ReactElement {
  const panelConfig = getKekoPilotPanelConfig();
  return <StaffLogin panelBranding={panelConfig.branding} variant="kekopilot" />;
}
