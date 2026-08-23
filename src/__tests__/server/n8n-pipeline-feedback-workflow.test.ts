import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type WorkflowNode = {
  readonly name: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly credentials?: unknown;
};

type Workflow = {
  readonly nodes: readonly WorkflowNode[];
  readonly connections: Record<string, { readonly main: readonly (readonly {
    readonly node: string;
  }[])[] }>;
};

function workflow(): Workflow {
  const file = resolve(process.cwd(), 'infra/n8n/workflows/socialpro-pipeline-deals-reader.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Workflow;
}

describe('workflow n8n de #pipeline-deals', () => {
  it('marca el mensaje original después de guardar el borrador en el CRM', () => {
    const value = workflow();
    const prepare = value.nodes.find((node) => node.name === 'Preparar estado Discord');
    const react = value.nodes.find((node) => node.name === 'Marcar estado en Discord');

    expect(prepare?.type).toBe('n8n-nodes-base.code');
    expect(react).toMatchObject({
      type: 'n8n-nodes-base.discord',
      parameters: { resource: 'message', operation: 'react' },
    });
    expect(value.connections['Enviar a CRM']?.main[0]?.[0]?.node)
      .toBe('Preparar estado Discord');
    expect(value.connections['Preparar estado Discord']?.main[0]?.[0]?.node)
      .toBe('Marcar estado en Discord');
  });

  it('cubre leído, incompleto, aprobado, rechazado y fallo', () => {
    const prepare = workflow().nodes.find((node) => node.name === 'Preparar estado Discord');
    const code = String(prepare?.parameters.jsCode ?? '');

    expect(code).toContain("missing_info: '⚠️'");
    expect(code).toContain("pending_review: '👀'");
    expect(code).toContain("created: '✅'");
    expect(code).toContain("rejected: '🚫'");
    expect(code).toContain("? '❌'");
  });

  it('no versiona credenciales de producción', () => {
    const react = workflow().nodes.find((node) => node.name === 'Marcar estado en Discord');
    expect(react?.credentials).toBeUndefined();
  });
});
