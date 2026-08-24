import fs from 'node:fs';
import path from 'node:path';

type WorkflowNode = {
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
};

type Workflow = {
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, { main: Array<Array<{ node: string }>> }>;
};

function workflow(): Workflow {
  const file = path.join(
    process.cwd(),
    'infra/n8n/workflows/socialpro-discord-channel-guides.json',
  );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Workflow;
}

describe('SocialPro Discord channel guides workflow', () => {
  it('publishes one recognizable guide in each automated channel', () => {
    const value = workflow();
    const sends = value.nodes.filter((node) => node.type === 'n8n-nodes-base.discord');
    const contents = sends.map((node) => String(node.parameters?.content ?? ''));

    expect(contents).toHaveLength(2);
    expect(contents.some((content) => content.includes('[SOCIALPRO-GUIDE-PIPELINE-V1]'))).toBe(true);
    expect(contents.some((content) => content.includes('[SOCIALPRO-GUIDE-OPS-V1]'))).toBe(true);
    expect(contents.some((content) => content.includes('10:00 (Europe/Madrid)'))).toBe(true);
  });

  it('pins both messages through the Discord credential without embedding a token', () => {
    const value = workflow();
    const pins = value.nodes.filter((node) => node.name.startsWith('Fijar guía'));

    expect(pins).toHaveLength(2);
    for (const node of pins) {
      expect(node.type).toBe('n8n-nodes-base.httpRequest');
      expect(node.parameters?.authentication).toBe('predefinedCredentialType');
      expect(node.parameters?.nodeCredentialType).toBe('discordBotApi');
      expect(String(node.parameters?.url)).toContain('/pins/');
      expect(node.credentials?.discordBotApi?.name).toBe('Discord Bot account');
      expect(JSON.stringify(node)).not.toMatch(/Bot\s+[A-Za-z0-9._-]{20,}/);
    }
  });

  it('is a one-time manual workflow so it cannot duplicate guides on a schedule', () => {
    const value = workflow();
    expect(value.active).toBe(false);
    expect(value.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger')).toHaveLength(1);
    expect(value.connections['Ejecutar una vez']?.main[0]).toHaveLength(2);
  });
});
