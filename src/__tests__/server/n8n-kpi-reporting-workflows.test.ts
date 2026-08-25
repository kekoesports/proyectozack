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

function workflow(name: string): Workflow {
  const file = resolve(process.cwd(), 'infra/n8n/workflows', name);
  return JSON.parse(readFileSync(file, 'utf8')) as Workflow;
}

describe('workflow n8n del KPI REPORTING diario', () => {
  const value = workflow('socialpro-deal-digest.json');

  it('publica todos los bloques preparados por el CRM sin límite de ocho tratos', () => {
    const prepare = value.nodes.find((node) => node.name === 'Preparar UPDATE DEALS');
    const publish = value.nodes.find((node) => node.name === 'Publicar UPDATE DEALS en Discord');
    const code = String(prepare?.parameters.jsCode ?? '');

    expect(prepare?.type).toBe('n8n-nodes-base.code');
    expect(code).toContain('$json.discordMessages');
    expect(code).toContain('.map((content)');
    expect(JSON.stringify(value)).not.toContain('maxLineas');
    expect(publish).toMatchObject({
      type: 'n8n-nodes-base.discord',
      parameters: { resource: 'message', operation: 'send' },
      retryOnFail: true,
    });
  });

  it('queda inactivo en el repositorio y no incluye credenciales reales', () => {
    expect(value.active).toBe(false);
    expect(value.nodes.every((node) => node.credentials === undefined)).toBe(true);
  });
});

describe('workflow n8n del bot de KPI REPORTING', () => {
  const value = workflow('socialpro-kpi-reporting-bot.json');

  it('sondea cada minuto y solo continúa ante comandos humanos nuevos', () => {
    const schedule = value.nodes.find((node) => node.name === 'Cada minuto');
    const detect = value.nodes.find((node) => node.name === 'Detectar comandos nuevos');
    const code = String(detect?.parameters.jsCode ?? '');

    expect(schedule?.parameters).toMatchObject({
      rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] },
    });
    expect(code).toContain("$getWorkflowStaticData('global')");
    expect(code).toContain('lastKpiMessageId');
    expect(code).toContain('message.author.bot === true');
    expect(code).toContain('if (commands.length === 0)');
    expect(code).toContain("command = 'review'");
    expect(code).toContain("command = 'detail'");
    expect(code).toContain("command = 'invoice_create'");
    expect(code).toContain("command = 'help'");
  });

  it('consulta el CRM, permite solo borradores fiscales y después guarda el watermark', () => {
    const request = value.nodes.find((node) => node.name === 'Consultar CRM');
    const send = value.nodes.find((node) => node.name === 'Responder en KPI REPORTING');
    const save = value.nodes.find((node) => node.name === 'Guardar watermark');
    const saveCode = String(save?.parameters.jsCode ?? '');

    expect(request).toMatchObject({ type: 'n8n-nodes-base.httpRequest', retryOnFail: true });
    expect(String(request?.parameters.url)).toContain('/api/automation/deals/digest');
    expect(String(request?.parameters.url)).toContain('/api/automation/deals/invoices');
    expect(String(request?.parameters.method)).toContain('invoice_create');
    expect(send).toMatchObject({
      type: 'n8n-nodes-base.discord',
      parameters: { resource: 'message', operation: 'send' },
      retryOnFail: true,
    });
    expect(value.connections['Responder en KPI REPORTING']?.main[0]?.[0]?.node)
      .toBe('Guardar watermark');
    expect(saveCode).toContain('state.lastKpiMessageId = maxId');
  });

  it('no usa IA, no sincroniza tratos y limita la escritura a borradores', () => {
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain('openAi');
    expect(serialized).not.toContain('langchain');
    expect(serialized).not.toContain('/sync');
    expect(serialized).toContain('/api/automation/deals/invoices');
    expect(serialized).toContain('no se emiten ni se envían automáticamente');
  });

  it('queda inactivo en el repositorio y sin credenciales versionadas', () => {
    expect(value.active).toBe(false);
    expect(value.nodes.every((node) => node.credentials === undefined)).toBe(true);
  });
});

describe('workflow n8n de progreso, facturas y recordatorios', () => {
  const value = workflow('socialpro-progress-alerts.json');

  it('sincroniza una vez y abre ramas idempotentes para facturas y 7 días', () => {
    const targets = value.connections['Sincronizar tratos']?.main[0]?.map((item) => item.node) ?? [];
    expect(targets).toEqual(expect.arrayContaining([
      'Hay avisos nuevos',
      'Crear borradores al 80%',
      'Revisar inactividad 7 días',
    ]));
    expect(JSON.stringify(value)).toContain('/api/automation/deals/invoices');
    expect(JSON.stringify(value)).toContain('/api/automation/deals/reminders');
  });

  it('confirma el recordatorio solo después de publicarlo en Discord', () => {
    expect(value.connections['Publicar recordatorio en Discord']?.main[0]?.[0]?.node)
      .toBe('Confirmar recordatorio en CRM');
  });

  it('queda inactivo en el repositorio y sin credenciales versionadas', () => {
    expect(value.active).toBe(false);
    expect(value.nodes.every((node) => node.credentials === undefined)).toBe(true);
  });
});
