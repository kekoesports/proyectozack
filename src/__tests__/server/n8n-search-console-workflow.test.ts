import { readFileSync } from 'fs';
import { resolve } from 'path';

type WorkflowNode = {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
};

type Workflow = {
  active: boolean;
  settings: { timezone?: string };
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
};

const file = resolve(process.cwd(), 'infra/n8n/workflows/socialpro-search-console-daily.json');
const workflow = JSON.parse(readFileSync(file, 'utf8')) as Workflow;

describe('workflow diario de Search Console', () => {
  it('nace inactivo y usa Europe/Madrid', () => {
    expect(workflow.active).toBe(false);
    expect(workflow.settings.timezone).toBe('Europe/Madrid');
  });

  it('solo consulta la propiedad exacta de socialpro.es con OAuth de kekoesports', () => {
    const googleNodes = workflow.nodes.filter(
      (node) => node.parameters.nodeCredentialType === 'googleOAuth2Api',
    );
    expect(googleNodes).toHaveLength(2);
    for (const node of googleNodes) {
      expect(node.parameters.authentication).toBe('predefinedCredentialType');
      expect(node.parameters.url).toBe(
        'https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fsocialpro.es%2F/searchAnalytics/query',
      );
      expect(node.credentials?.googleOAuth2Api).toEqual({
        id: 'oZg8v0k6De5-VgUm',
        name: 'SocialPro Search Console - kekoesports',
      });
    }
  });

  it('entrega un snapshot autenticado al endpoint SEO del CRM', () => {
    const crmNode = workflow.nodes.find((node) => node.name === 'Entregar snapshot al agente SEO');
    expect(crmNode?.parameters.url).toBe('https://socialpro.es/api/automation/seo/search-console');
    expect(crmNode?.credentials?.httpHeaderAuth?.name).toBe('SocialPro CRM - Production');
    expect(crmNode?.parameters.jsonBody).toBe('={{ JSON.stringify($json) }}');
  });

  it('no declara nodos de Gmail, Drive ni Discord', () => {
    const types = workflow.nodes.map((node) => node.type);
    expect(types).not.toContain('n8n-nodes-base.gmail');
    expect(types).not.toContain('n8n-nodes-base.googleDrive');
    expect(types).not.toContain('n8n-nodes-base.discord');
  });
});
