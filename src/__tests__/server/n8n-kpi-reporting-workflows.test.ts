import { expectGuardOnly, workflow } from './n8n-guard-workflow-fixture';

describe('KPI REPORTING: plantillas de transporte al guard persistente', () => {
  it('digest conserva las 10:00 de Madrid y entrega/recibos pertenecen al guard', () => {
    const value = workflow('socialpro-deal-digest.json');
    expectGuardOnly(value, 'digest');
    const schedule = value.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger');
    expect(schedule?.parameters).toMatchObject({
      rule: { interval: [{ field: 'cronExpression', expression: '0 10 * * *' }] },
    });
    expect(value.settings.timezone).toBe('Europe/Madrid');
  });

  it('bot sondea cada minuto sin cursor volátil ni comandos de facturación', () => {
    const value = workflow('socialpro-kpi-reporting-bot.json');
    expectGuardOnly(value, 'kpi');
    expect(value.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger')?.parameters)
      .toMatchObject({ rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } });
    // T0, actors and no-new-message behavior are tested in gates/pollers.test.cjs.
    expect(value.nodes.some(node => node.parameters.jsCode !== undefined)).toBe(false);
  });

  it('progreso conserva frecuencia horaria sin ramas de facturas, emails ni recordatorios', () => {
    const value = workflow('socialpro-progress-alerts.json');
    expectGuardOnly(value, 'progress');
    expect(value.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger')?.parameters)
      .toMatchObject({ rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } });
    expect(value.nodes).toHaveLength(3);
  });

  it.each([
    ['socialpro-deal-digest.json', 'digest'],
    ['socialpro-kpi-reporting-bot.json', 'kpi'],
    ['socialpro-progress-alerts.json', 'progress'],
  ])('%s mantiene sonda autenticada con resultado real del guard', (file, family) => {
    const value = workflow(file);
    const hook = value.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    expect(hook?.parameters).toMatchObject({ httpMethod: 'POST', authentication: 'headerAuth',
      responseMode: 'lastNode', path: 'socialpro-internal-check-' + family + '-20260905' });
    expectGuardOnly(value, family);
  });
});
