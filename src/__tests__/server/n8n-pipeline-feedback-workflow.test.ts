import { expectGuardOnly, workflow } from './n8n-guard-workflow-fixture';

describe('pipeline: cursor y confirmaciones en el guard duradero', () => {
  it('sondea cada dos minutos y no hace un POST directo con mensajes históricos', () => {
    const value = workflow('socialpro-pipeline-deals-reader.json');
    expectGuardOnly(value, 'pipeline');
    expect(value.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger')?.parameters)
      .toMatchObject({ rule: { interval: [{ field: 'minutes', minutesInterval: 2 }] } });
  });

  it('requiere autenticar la sonda; no permite un error parcial como salida regular', () => {
    const value = workflow('socialpro-pipeline-deals-reader.json');
    const operation = expectGuardOnly(value, 'pipeline');
    expect(operation.onError).toBeUndefined();
    expect(value.nodes.find(node => node.type === 'n8n-nodes-base.webhook')?.parameters)
      .toMatchObject({ authentication: 'headerAuth', responseMode: 'lastNode' });
  });

  it('alta ya no termina en noOp y usa identidad durable del mismo guard', () => {
    const value = workflow('socialpro-deal-intake.json');
    expectGuardOnly(value, 'intake');
    expect(value.nodes).toHaveLength(2);
    expect(value.nodes[0]?.parameters).toMatchObject({
      path: 'socialpro-deals-8f3a1c2e-5b7d-4a19-9e64-2c0d7f5a1b83',
      authentication: 'headerAuth', responseMode: 'lastNode',
    });
  });

  it('ambas plantillas no contienen código, estado global ni envíos Discord paralelos', () => {
    for (const file of ['socialpro-pipeline-deals-reader.json', 'socialpro-deal-intake.json']) {
      const value = workflow(file);
      expect(value.active).toBe(false);
      expect(value.nodes.every(node => node.parameters.jsCode === undefined)).toBe(true);
      expect(value.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest')).toHaveLength(1);
    }
    // Actual replay/uncertainty behavior is verified by guard runtime tests;
    // these assertions prove the template cannot bypass that boundary.
  });
});
