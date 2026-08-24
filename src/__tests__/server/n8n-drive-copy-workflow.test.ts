import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type WorkflowNode = {
  readonly name: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly credentials?: unknown;
};

describe('workflow n8n para copiar Sheets en carpetas personales', () => {
  const file = resolve(
    process.cwd(),
    'infra/n8n/workflows/socialpro-drive-copy-creator-folder.json',
  );
  const workflow = JSON.parse(readFileSync(file, 'utf8')) as {
    active: boolean;
    nodes: WorkflowNode[];
  };

  it('exige autenticación y copia únicamente IDs validados', () => {
    const webhook = workflow.nodes.find((node) => node.name === 'Solicitud autenticada del CRM');
    const validate = workflow.nodes.find((node) => node.name === 'Validar copia solicitada');
    const copy = workflow.nodes.find((node) => node.name === 'Copiar con Drive de pcamacho');

    expect(webhook).toMatchObject({
      type: 'n8n-nodes-base.webhook',
      parameters: { httpMethod: 'POST', authentication: 'headerAuth', responseMode: 'lastNode' },
    });
    expect(String(validate?.parameters.jsCode)).toContain('invalid-drive-id');
    expect(copy).toMatchObject({
      type: 'n8n-nodes-base.googleDrive',
      parameters: { authentication: 'oAuth2', resource: 'file', operation: 'copy' },
    });
  });

  it('se versiona inactivo y sin credenciales reales', () => {
    expect(workflow.active).toBe(false);
    expect(workflow.nodes.every((node) => node.credentials === undefined)).toBe(true);
  });
});
