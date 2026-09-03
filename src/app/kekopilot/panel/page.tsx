import type { Metadata, Viewport } from 'next';
import { Familjen_Grotesk, IBM_Plex_Mono, Karla } from 'next/font/google';
import { KekoPilotPanel } from '@/features/kekopilot-panel/KekoPilotPanel';
import { createDemoKekoPilotPanelData } from '@/features/kekopilot-panel/demo-data';
import { env } from '@/lib/env';
import { requirePermission } from '@/lib/permissions';
import { getKekoPilotPanelData } from '@/lib/queries/kekopilot-panel';

const heading = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--kp-panel-heading',
  display: 'swap',
});

const body = Karla({
  subsets: ['latin'],
  variable: '--kp-panel-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--kp-panel-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { absolute: 'Command Center · KekoPilot' },
  description: 'Panel operativo de KekoPilot para revisar decisiones, bloqueos, agentes y automatizaciones.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0b1113' };

export default async function KekoPilotPanelPage(): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read', '/login');
  const user = {
    userId: session.user.id,
    name: session.user.name,
    role: session.user.role,
  };
  const panelData = env.KEKOPILOT_DEMO_MODE
    ? createDemoKekoPilotPanelData(user)
    : await getKekoPilotPanelData(user);

  return (
    <div className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <KekoPilotPanel data={panelData} />
    </div>
  );
}
