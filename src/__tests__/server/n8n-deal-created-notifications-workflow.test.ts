import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type WorkflowNode = {
  readonly name: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly credentials?: unknown;
  readonly retryOnFail?: boolean;
};

type Workflow = {
  readonly active: boolean;
  readonly nodes: readonly WorkflowNode[];
  readonly connections: Record<string, { readonly main: readonly (readonly {
    readonly node: string;
  }[])[] }>;
};

function workflow(): Workflow {
  const file = resolve(
    process.cwd(),
    'infra/n8n/workflows/socialpro-discord-deal-created-notifications.json',
  );
  return JSON.parse(readFileSync(file, 'utf8')) as Workflow;
}

describe('workflow n8n de confirmación de tratos creados', () => {
  it('publica en Discord y solo después confirma el envío al CRM', () => {
    const value = workflow();
    const publish = value.nodes.find((node) => node.name === 'Publicar TRATO CREADO');
    const ack = value.nodes.find((node) => node.name === 'Confirmar publicación al CRM');

    expect(publish).toMatchObject({
      type: 'n8n-nodes-base.discord',
      parameters: { resource: 'message', operation: 'send' },
      retryOnFail: true,
    });
    expect(ack).toMatchObject({ type: 'n8n-nodes-base.httpRequest', retryOnFail: true });
    expect(String(ack?.parameters.url)).toContain("$('Preparar confirmaciones').item.json.draftId");
    expect(value.connections['Publicar TRATO CREADO']?.main[0]?.[0]?.node)
      .toBe('Confirmar publicación al CRM');
  });

  it('se puede despertar al instante y conserva el sondeo como respaldo', () => {
    const value = workflow();
    const webhook = value.nodes.find((node) => node.name === 'Aviso inmediato del CRM');
    const schedule = value.nodes.find((node) => node.name === 'Cada 2 minutos');

    expect(webhook).toMatchObject({
      type: 'n8n-nodes-base.webhook',
      parameters: { httpMethod: 'POST', authentication: 'headerAuth' },
    });
    expect(schedule).toMatchObject({ type: 'n8n-nodes-base.scheduleTrigger' });
    expect(value.connections['Aviso inmediato del CRM']?.main[0]?.[0]?.node).toBe('Config');
    expect(value.connections['Cada 2 minutos']?.main[0]?.[0]?.node).toBe('Config');
  });

  it('no envía nada cuando el CRM no devuelve confirmaciones', () => {
    const value = workflow();
    const prepare = value.nodes.find((node) => node.name === 'Preparar confirmaciones');
    const code = String(prepare?.parameters.jsCode ?? '');

    expect(code).toContain('Array.isArray($json.notifications)');
    expect(code).toContain('return notifications.flatMap');
    expect(value.connections['Preparar confirmaciones']?.main[0]?.[0]?.node)
      .toBe('Publicar TRATO CREADO');
  });

  it('queda inactivo en el archivo y no versiona credenciales reales', () => {
    const value = workflow();
    expect(value.active).toBe(false);
    expect(value.nodes.every((node) => node.credentials === undefined)).toBe(true);
  });
});
