import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createPanelConfiguration } from '@/features/kekopilot-panel/branding';
import { createDemoKekoPilotPanelData } from '@/features/kekopilot-panel/demo-data';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('KekoPilot panel product surface', () => {
  it('keeps internal prototype documentation out of the customer panel', () => {
    const panelSource = read('src/features/kekopilot-panel/KekoPilotPanel.tsx');
    const commandCenterSource = read('src/features/kekopilot-panel/CommandCenter.tsx');

    expect(panelSource).not.toContain('ArchitectureView');
    expect(panelSource).not.toContain('VIEW_LABELS');
    expect(panelSource).not.toContain('⌘J');
    expect(commandCenterSource).not.toContain('No hay elementos reales');
  });

  it('uses operational labels instead of implementation language', () => {
    const configuration = createPanelConfiguration({
      productName: 'KekoPilot',
      appUrl: 'https://app.kekopilot.com',
      assistantName: 'Zack Operaciones',
      agentName: 'Zack',
      accentColor: '#ffb020',
      referencePrefix: 'KP',
      supportHref: 'https://kekopilot.com',
      workspaceName: 'Workspace de prueba',
      workspaceMeta: 'Datos de demostración',
      homeHref: '/admin',
    });
    const data = createDemoKekoPilotPanelData(
      { name: 'Usuario de prueba', role: 'admin' },
      configuration,
    );

    expect(data.metrics.map((metric) => metric.label)).toEqual([
      'Pendiente de aprobación',
      'Deals con incidencias',
      'Seguimientos sin actividad',
      'Ejecuciones fallidas',
    ]);
    expect(data.sidePanels.map((panel) => panel.title)).toEqual([
      'Actividad de agentes',
      'Estado del seguimiento',
      'Carga de trabajo',
    ]);
    expect(JSON.stringify(data)).not.toContain('fuente canónica');
    expect(JSON.stringify(data)).not.toContain('campaigns.last_tracking_sync_at');
  });
});
