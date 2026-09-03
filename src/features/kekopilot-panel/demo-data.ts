import type { KekoPilotPanelData } from './data';

type DemoUser = { readonly name: string; readonly role: string };

export function createDemoKekoPilotPanelData(user: DemoUser): KekoPilotPanelData {
  const kito = {
    id: '1042', ref: 'SP-1042', name: 'Lanzamiento de producto', creator: 'Kito Vane', brand: 'Aurex Energy',
    state: 'Activa', tone: 'attention' as const, amount: '25.200 €', margin: '29%', owner: 'MC', progress: 68,
    alert: 'Requiere aprobación', flags: { mine: true, blocked: false, approval: true, closed: false },
  };
  const vera = {
    id: '1047', ref: 'SP-1047', name: 'Campaña always-on', creator: 'Vera Nolan', brand: 'Northwind Labs',
    state: 'Bloqueada', tone: 'danger' as const, amount: '28.500 €', margin: '31%', owner: 'MC', progress: 34,
    alert: 'Seguimiento sin actualizar', flags: { mine: true, blocked: true, approval: false, closed: false },
  };
  const sela = {
    id: '1028', ref: 'SP-1028', name: 'Activación Q3', creator: 'Sela Braun', brand: 'Northwind Labs',
    state: 'Pagada', tone: 'neutral' as const, amount: '23.000 €', margin: '30%', owner: 'LF', progress: 100,
    alert: 'Al día', flags: { mine: false, blocked: false, approval: false, closed: true },
  };

  return {
    workspace: { name: 'SocialPro', meta: 'Workspace operativo · modo de prueba', initials: 'SP' },
    user: { name: user.name, role: user.role, initials: 'DV' },
    generatedAt: '10:24',
    counts: { approvals: 2, deals: 3, tasks: 1, agents: 3 },
    metrics: [
      { label: 'Necesita tu decisión', value: '2', note: 'aprobaciones de agentes', tone: 'attention' },
      { label: 'Deals bloqueados', value: '1', note: 'alertas o sync pendiente', tone: 'danger' },
      { label: 'Documentos estancados', value: '1', note: 'hojas sin actividad > 7 d', tone: 'attention' },
      { label: 'Automatizaciones con error', value: '1', note: 'agentes · últimas 24 h', tone: 'danger' },
    ],
    inbox: [
      {
        id: 'approval-1', priority: 1, state: 'Pendiente aprobación', tone: 'attention',
        title: 'Emitir factura intermedia · Deal SP-1042', body: 'Zack Deal Clerk preparó la acción y espera una revisión humana.',
        evidence: 'deal-clerk · create_invoice v1', owner: 'deal-clerk', due: 'Hoy', action: 'Revisar',
        href: '/admin/agents/approvals', category: 'Aprobaciones',
      },
      {
        id: 'campaign-1047', priority: 2, state: 'Bloqueado', tone: 'danger',
        title: 'Campaña always-on · SP-1047', body: 'La hoja de seguimiento no registra actividad reciente.',
        evidence: 'SocialPro CRM · última actividad 25 ago', owner: 'María Corvo', due: 'Hace 2 d', action: 'Abrir deal',
        href: '/admin/campanas/1047', category: 'Bloqueos',
      },
      {
        id: 'run-8', priority: 2, state: 'Error', tone: 'danger', title: 'Zack Deal Clerk · ejecución 8',
        body: 'No se pudo sincronizar la hoja conectada.', evidence: 'sheet_sync_failed', owner: 'deal-clerk',
        due: 'Hoy', action: 'Ver ejecución', href: '/admin/agents/runs/8', category: 'Errores',
      },
    ],
    sidePanels: [
      { title: 'Propuestas de los agentes', meta: '2 esperan decisión', rows: [
        { title: 'Zack Deal Clerk', body: '8 ejecuciones · 1 fallida en 7 d', value: '2', tone: 'attention', href: '/admin/agents' },
        { title: 'Zack CRM', body: '12 ejecuciones · 0 fallidas en 7 d', value: '0', tone: 'success', href: '/admin/agents' },
      ] },
      { title: 'Automatizaciones de deals', meta: 'hojas conectadas', rows: [
        { title: 'Sincronizadas', body: 'Deals con seguimiento al día', value: '1', tone: 'success', href: '/admin/campanas' },
        { title: 'Estancadas', body: 'Más de 7 días sin actividad', value: '1', tone: 'attention', href: '/admin/campanas' },
        { title: 'Con error', body: 'Requieren revisar conexión o formato', value: '1', tone: 'danger', href: '/admin/campanas' },
      ] },
      { title: 'Operación SocialPro', meta: 'fuente canónica', rows: [
        { title: 'Deals activos', body: 'Propuesta, negociación, aprobada o activa', value: '2', tone: 'neutral', href: '/admin/campanas' },
        { title: 'Tareas urgentes', body: 'Abiertas y vencidas', value: '1', tone: 'attention', href: '/admin/tareas' },
        { title: 'Datos', body: 'Lectura directa del CRM, sin copia', value: 'DEMO', tone: 'neutral' },
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
          { id: '1', title: 'Vídeo integrado 60 s', body: 'video youtube · contenido vinculado', date: '12 ago', state: 'Aprobado', done: true },
          { id: '2', title: 'Informe de resultados', body: 'otro', date: '12 sep', state: 'Pendiente', done: false },
        ],
        documents: [
          { id: 'tracking-1042', title: 'Hoja de seguimiento', meta: 'Sincronizada 2 sep', state: 'Conectada', href: '/admin/campanas/1042', attention: false },
          { id: 'invoice-2', title: 'Factura A-2026-42', meta: 'Campaña · 8.400 €', state: 'borrador', href: '/admin/facturacion', attention: true },
        ],
        alerts: [{ id: 'approval-1', title: 'Factura preparada sin emitir', body: 'Espera aprobación en SocialPro.', tone: 'attention' }],
        activity: [
          { id: 'approval-1', kind: 'Pendiente', tone: 'attention', source: 'deal-clerk', when: 'Hoy', text: 'Preparó la factura y la dejó sin emitir.', evidence: 'create_invoice v1' },
          { id: 'crm-1042', kind: 'Información', tone: 'neutral', source: 'SocialPro CRM', when: '2 sep', text: 'El deal está activo.', evidence: 'campaigns · SP-1042' },
        ],
      },
      '1047': {
        deal: vera, stage: 'Propuesta', crmHref: '/admin/campanas/1047', deliverables: [],
        documents: [{ id: 'tracking-1047', title: 'Hoja de seguimiento', meta: 'Sincronizada 25 ago', state: 'Estancada', href: '/admin/campanas/1047', attention: true }],
        alerts: [{ id: 'stale-1047', title: 'Seguimiento estancado', body: 'La hoja conectada lleva más de siete días sin actividad.', tone: 'attention' }],
        activity: [{ id: 'crm-1047', kind: 'Información', tone: 'neutral', source: 'SocialPro CRM', when: '25 ago', text: 'El deal está en propuesta.', evidence: 'campaigns · SP-1047' }],
      },
      '1028': {
        deal: sela, stage: 'Cierre y cobro', crmHref: '/admin/campanas/1028', deliverables: [], documents: [], alerts: [],
        activity: [{ id: 'crm-1028', kind: 'Información', tone: 'neutral', source: 'SocialPro CRM', when: '1 sep', text: 'El deal está pagado.', evidence: 'campaigns · SP-1028' }],
      },
    },
  };
}
