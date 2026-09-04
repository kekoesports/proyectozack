import type { KekoPilotPanelConfig, KekoPilotPanelData } from './data';

type DemoUser = { readonly name: string; readonly role: string };

export function createDemoKekoPilotPanelData(
  user: DemoUser,
  config: KekoPilotPanelConfig,
): KekoPilotPanelData {
  const referencePrefix = config.branding.referencePrefix;
  const workspaceName = config.workspace.name;
  const agentName = config.branding.agentName;
  const kito = {
    id: '1042', ref: `${referencePrefix}-1042`, name: 'Lanzamiento de producto', creator: 'Kito Vane', brand: 'Aurex Energy',
    state: 'Activa', tone: 'attention' as const, amount: '25.200 €', margin: '29%', owner: 'MC', progress: 68,
    alert: 'Requiere aprobación', flags: { mine: true, blocked: false, approval: true, closed: false },
  };
  const vera = {
    id: '1047', ref: `${referencePrefix}-1047`, name: 'Campaña always-on', creator: 'Vera Nolan', brand: 'Northwind Labs',
    state: 'Bloqueada', tone: 'danger' as const, amount: '28.500 €', margin: '31%', owner: 'MC', progress: 34,
    alert: 'Seguimiento sin actualizar', flags: { mine: true, blocked: true, approval: false, closed: false },
  };
  const sela = {
    id: '1028', ref: `${referencePrefix}-1028`, name: 'Activación Q3', creator: 'Sela Braun', brand: 'Northwind Labs',
    state: 'Pagada', tone: 'neutral' as const, amount: '23.000 €', margin: '30%', owner: 'LF', progress: 100,
    alert: 'Al día', flags: { mine: false, blocked: false, approval: false, closed: true },
  };

  return {
    branding: config.branding,
    workspace: { ...config.workspace, meta: `${config.workspace.meta} · modo de prueba` },
    user: { name: user.name, role: user.role, initials: 'DV' },
    generatedAt: '10:24',
    counts: { approvals: 2, deals: 3, tasks: 1, agents: 3 },
    metrics: [
      { label: 'Pendiente de aprobación', value: '2', note: 'acciones por revisar', tone: 'attention' },
      { label: 'Deals con incidencias', value: '1', note: 'errores o seguimiento detenido', tone: 'danger' },
      { label: 'Seguimientos sin actividad', value: '1', note: 'más de 7 días sin cambios', tone: 'attention' },
      { label: 'Ejecuciones fallidas', value: '1', note: 'agentes · últimas 24 horas', tone: 'danger' },
    ],
    inbox: [
      {
        id: 'approval-1', priority: 1, state: 'Pendiente aprobación', tone: 'attention',
        title: `Emitir factura intermedia · Deal ${referencePrefix}-1042`, body: `${agentName} Deal Clerk preparó la acción y espera una revisión humana.`,
        evidence: `${agentName} Deal Clerk · solicitud registrada 4 sep`, owner: `${agentName} Deal Clerk`, due: 'Hoy', action: 'Revisar',
        href: '/admin/agents/approvals', category: 'Aprobaciones',
      },
      {
        id: 'campaign-1047', priority: 2, state: 'Bloqueado', tone: 'danger',
        title: `Campaña always-on · ${referencePrefix}-1047`, body: 'La hoja de seguimiento no registra actividad reciente.',
        evidence: `${workspaceName} · última actividad 25 ago`, owner: 'María Corvo', due: 'Hace 2 d', action: 'Abrir deal',
        href: '/admin/campanas/1047', category: 'Bloqueos',
      },
      {
        id: 'run-8', priority: 2, state: 'Error', tone: 'danger', title: `${agentName} Deal Clerk no completó la tarea`,
        body: 'No se pudo sincronizar la hoja conectada.', evidence: 'Registro de ejecución · SHEET_SYNC_FAILED', owner: `${agentName} Deal Clerk`,
        due: 'Hoy', action: 'Ver ejecución', href: '/admin/agents/runs/8', category: 'Errores',
      },
    ],
    sidePanels: [
      { title: 'Actividad de agentes', meta: '2 por revisar', rows: [
        { title: `${agentName} Deal Clerk`, body: '8 ejecuciones en 7 días · 1 con error', value: '2', tone: 'attention', href: '/admin/agents' },
        { title: `${agentName} CRM`, body: '12 ejecuciones en 7 días · 0 con error', value: '0', tone: 'success', href: '/admin/agents' },
      ] },
      { title: 'Estado del seguimiento', meta: 'deals con hoja conectada', rows: [
        { title: 'Al día', body: 'Seguimiento sincronizado y con actividad reciente', value: '1', tone: 'success', href: '/admin/campanas' },
        { title: 'Sin actividad', body: 'Más de 7 días sin cambios', value: '1', tone: 'attention', href: '/admin/campanas' },
        { title: 'Con incidencia', body: 'Conexión o formato pendientes de revisión', value: '1', tone: 'danger', href: '/admin/campanas' },
      ] },
      { title: 'Carga de trabajo', meta: workspaceName, rows: [
        { title: 'Deals activos', body: 'Propuesta, negociación, aprobada o activa', value: '2', tone: 'neutral', href: '/admin/campanas' },
        { title: 'Tareas urgentes', body: 'Abiertas y vencidas', value: '1', tone: 'attention', href: '/admin/tareas' },
        { title: 'Última actualización', body: 'CRM, tareas y agentes', value: '10:24', tone: 'success' },
      ] },
    ],
    pipeline: {
      total: '76.700 €', averageMargin: '30%', blocked: 1,
      stages: [
        { name: 'Propuesta', total: '28.500 €', deals: [vera] },
        { name: 'Negociación', total: '0 €', deals: [] },
        { name: 'Aprobada', total: '0 €', deals: [] },
        { name: 'En ejecución', total: '25.200 €', deals: [kito] },
        { name: 'Cierre y cobro', total: '23.000 €', deals: [sela] },
      ],
    },
    dealDetails: {
      '1042': {
        deal: kito, stage: 'En ejecución', crmHref: '/admin/campanas/1042',
        deliverables: [
          { id: '1', title: 'Vídeo integrado 60 s', body: 'Vídeo de YouTube · contenido vinculado', date: '12 ago', state: 'Aprobado', done: true },
          { id: '2', title: 'Informe de resultados', body: 'Otro formato', date: '12 sep', state: 'Pendiente', done: false },
        ],
        documents: [
          { id: 'tracking-1042', title: 'Hoja de seguimiento', meta: 'Sincronizada 2 sep', state: 'Conectada', href: '/admin/campanas/1042', attention: false },
          { id: 'invoice-2', title: 'Factura A-2026-42', meta: 'Campaña · 8.400 €', state: 'borrador', href: '/admin/facturacion', attention: true },
        ],
        alerts: [{ id: 'approval-1', title: 'Factura preparada sin emitir', body: `Espera aprobación en ${workspaceName}.`, tone: 'attention' }],
        activity: [
          { id: 'approval-1', kind: 'Pendiente', tone: 'attention', source: `${agentName} Deal Clerk`, when: 'Hoy', text: 'Preparó la factura y la dejó sin emitir.', evidence: 'Revisión solicitada 4 sep' },
          { id: 'crm-1042', kind: 'Información', tone: 'neutral', source: `${workspaceName} CRM`, when: '2 sep', text: 'El deal está activo.', evidence: `Ficha ${referencePrefix}-1042` },
        ],
      },
      '1047': {
        deal: vera, stage: 'Propuesta', crmHref: '/admin/campanas/1047', deliverables: [],
        documents: [{ id: 'tracking-1047', title: 'Hoja de seguimiento', meta: 'Sincronizada 25 ago', state: 'Estancada', href: '/admin/campanas/1047', attention: true }],
        alerts: [{ id: 'stale-1047', title: 'Seguimiento estancado', body: 'La hoja conectada lleva más de siete días sin actividad.', tone: 'attention' }],
        activity: [{ id: 'crm-1047', kind: 'Información', tone: 'neutral', source: `${workspaceName} CRM`, when: '25 ago', text: 'El deal está en propuesta.', evidence: `Ficha ${referencePrefix}-1047` }],
      },
      '1028': {
        deal: sela, stage: 'Cierre y cobro', crmHref: '/admin/campanas/1028', deliverables: [], documents: [], alerts: [],
        activity: [{ id: 'crm-1028', kind: 'Información', tone: 'neutral', source: `${workspaceName} CRM`, when: '1 sep', text: 'El deal está pagado.', evidence: `Ficha ${referencePrefix}-1028` }],
      },
    },
  };
}
