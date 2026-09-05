import { expectGuardOnly, workflow } from './n8n-guard-workflow-fixture';

describe('confirmación de tratos: entrega y ACK en guard', () => {
  it('conserva aviso inmediato y sondeo de respaldo al mismo controlador notify', () => {
    const value = workflow('socialpro-discord-deal-created-notifications.json');
    const operation = expectGuardOnly(value, 'notify');
    const hook = value.nodes.find(node => node.name === 'Aviso inmediato del CRM');
    const schedule = value.nodes.find(node => node.name === 'Cada 2 minutos');
    expect(hook?.parameters).toMatchObject({ httpMethod: 'POST', authentication: 'headerAuth',
      path: 'socialpro-deal-created-c65a5040-f475-4f17-9527-934220db4d6f', responseMode: 'onReceived' });
    // This original hook acknowledges receipt immediately. Its HTTP success
    // is not proof of delivery; execution + guard receipt/ACK are authoritative.
    expect(schedule?.parameters).toMatchObject({ rule: { interval: [{ field: 'minutes', minutesInterval: 2 }] } });
    expect(value.connections['Aviso inmediato del CRM']?.main[0]?.[0]?.node).toBe(operation.name);
    expect(value.connections['Cada 2 minutos']?.main[0]?.[0]?.node).toBe(operation.name);
  });

  it('no conserva envío o ACK directo que eluda la deduplicación persistente', () => {
    const value = workflow('socialpro-discord-deal-created-notifications.json');
    expectGuardOnly(value, 'notify');
    expect(value.nodes).toHaveLength(3);
    expect(Object.keys(value.connections)).toHaveLength(2);
    // Receipt-before-ACK and replay are verified in guard runtime tests.
    expect(value.nodes.every(node => node.parameters.jsCode === undefined)).toBe(true);
  });

  it('queda desactivada al importar y requiere vincular credencial, nunca secreto en JSON', () => {
    const value = workflow('socialpro-discord-deal-created-notifications.json');
    const operation = expectGuardOnly(value, 'notify');
    expect(value.active).toBe(false);
    expect(operation.notes).toContain('Importación segura');
    expect(operation.parameters.headerParameters).toBeUndefined();
  });
});
