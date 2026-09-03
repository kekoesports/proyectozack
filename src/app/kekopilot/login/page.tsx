import type { Metadata, Viewport } from 'next';
import { StaffLogin } from '@/app/admin/login/page';

export const metadata: Metadata = {
  title: { absolute: 'Acceso · KekoPilot' },
  description: 'Acceso privado al Command Center de KekoPilot.',
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/kekopilot/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = { themeColor: '#0b1113' };

export default function KekoPilotLoginPage(): React.ReactElement {
  return <StaffLogin variant="kekopilot" />;
}
