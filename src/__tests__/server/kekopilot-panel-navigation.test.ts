import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NAVIGATION } from '@/features/kekopilot-panel/data';
import { isKekoPilotAppHost } from '@/lib/kekopilot-host';

describe('KekoPilot panel navigation', () => {
  it('routes every sidebar entry to a distinct working surface', () => {
    const items = NAVIGATION.flatMap((group) => group.items);
    const destinations = new Map(items.map((item) => [item.label, item.view ?? item.href]));

    expect(items).toHaveLength(15);
    expect(Object.fromEntries(destinations)).toEqual({
      'Command Center': 'command',
      Deals: 'pipeline',
      Talentos: '/admin/talents',
      Descubrimiento: '/admin/targets',
      'Leads y comunicaciones': '/admin/leads',
      'Tareas y aprobaciones': '/admin/tareas',
      Documentos: '/admin/contratos',
      Automatizaciones: '/admin/automation-drafts',
      Agentes: '/admin/agents',
      'Analítica e informes': '/admin/analytics',
      Finanzas: '/admin/finanzas/resumen',
      Integraciones: '/admin/entregables/fuentes',
      'Equipo y permisos': '/admin/equipo',
      'Seguridad y auditoría': '/admin/seguridad',
      Configuración: '/admin/configuracion',
    });
  });

  it('exposes authenticated admin and API routes on the KekoPilot app host', () => {
    const caddyfile = readFileSync(resolve(process.cwd(), 'infra/edge/Caddyfile'), 'utf-8');

    expect(caddyfile).toContain('/admin* /api/* /_next/*');
    expect(caddyfile).not.toContain('@privateAdmin');
  });

  it('recognizes only the canonical KekoPilot application host', () => {
    expect(isKekoPilotAppHost('app.kekopilot.com')).toBe(true);
    expect(isKekoPilotAppHost('APP.KEKOPILOT.COM:443')).toBe(true);
    expect(isKekoPilotAppHost('app.kekopilot.com, proxy.internal')).toBe(true);
    expect(isKekoPilotAppHost('socialpro.es')).toBe(false);
    expect(isKekoPilotAppHost(null)).toBe(false);
  });
});
