export type PanelView = 'command' | 'pipeline' | 'deal';
export type InboxFilter = 'Todas' | 'Aprobaciones' | 'Bloqueos' | 'Errores';
export type Tone = 'attention' | 'danger' | 'neutral' | 'success' | 'draft';

export type NavigationItem = {
  readonly label: string;
  readonly icon: 'gauge' | 'briefcase' | 'user' | 'search' | 'mail' | 'tasks' | 'file' | 'workflow' | 'bot' | 'chart' | 'euro' | 'link' | 'users' | 'shield' | 'settings';
  readonly view?: PanelView;
  readonly href?: string;
  readonly badgeKey?: keyof PanelCounts;
};

export type NavigationGroup = {
  readonly title: string;
  readonly items: ReadonlyArray<NavigationItem>;
};

export type PanelMetric = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly tone: Tone;
};

export type InboxItem = {
  readonly id: string;
  readonly priority: 1 | 2 | 3;
  readonly state: string;
  readonly tone: Tone;
  readonly title: string;
  readonly body: string;
  readonly evidence: string;
  readonly owner: string;
  readonly due: string;
  readonly action: string;
  readonly href: string;
  readonly category: Exclude<InboxFilter, 'Todo'>;
};

export type SidePanel = {
  readonly title: string;
  readonly meta: string;
  readonly rows: ReadonlyArray<{
    readonly title: string;
    readonly body: string;
    readonly value: string;
    readonly tone: Tone;
    readonly href?: string;
  }>;
};

export type DealCard = {
  readonly id: string;
  readonly ref: string;
  readonly name: string;
  readonly creator: string;
  readonly brand: string;
  readonly state: string;
  readonly tone: Tone;
  readonly amount: string;
  readonly margin: string;
  readonly owner: string;
  readonly progress: number;
  readonly alert: string;
  readonly flags: {
    readonly mine: boolean;
    readonly blocked: boolean;
    readonly approval: boolean;
    readonly closed: boolean;
  };
};

export type DealStage = {
  readonly name: string;
  readonly total: string;
  readonly deals: ReadonlyArray<DealCard>;
};

export type DealDetailData = {
  readonly deal: DealCard;
  readonly stage: string;
  readonly crmHref: string;
  readonly deliverables: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly date: string;
    readonly state: string;
    readonly done: boolean;
  }>;
  readonly documents: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly meta: string;
    readonly state: string;
    readonly href: string;
    readonly attention: boolean;
  }>;
  readonly alerts: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly tone: Tone;
  }>;
  readonly activity: ReadonlyArray<{
    readonly id: string;
    readonly kind: string;
    readonly tone: Tone;
    readonly source: string;
    readonly when: string;
    readonly text: string;
    readonly evidence: string;
  }>;
};

export type PanelCounts = {
  readonly approvals: number;
  readonly deals: number;
  readonly tasks: number;
  readonly agents: number;
};

export type PanelBranding = {
  readonly productName: string;
  readonly productInitials: string;
  readonly appUrl: string;
  readonly assistantName: string;
  readonly agentName: string;
  readonly accentColor: string;
  readonly accentTextColor: string;
  readonly referencePrefix: string;
  readonly supportHref: string;
  readonly logoPath?: string;
};

export type PanelWorkspace = {
  readonly name: string;
  readonly meta: string;
  readonly initials: string;
  readonly homeHref: string;
};

export type KekoPilotPanelConfig = {
  readonly branding: PanelBranding;
  readonly workspace: PanelWorkspace;
};

export type KekoPilotPanelData = {
  readonly branding: PanelBranding;
  readonly workspace: PanelWorkspace;
  readonly user: { readonly name: string; readonly role: string; readonly initials: string };
  readonly generatedAt: string;
  readonly counts: PanelCounts;
  readonly metrics: ReadonlyArray<PanelMetric>;
  readonly inbox: ReadonlyArray<InboxItem>;
  readonly sidePanels: ReadonlyArray<SidePanel>;
  readonly pipeline: {
    readonly total: string;
    readonly averageMargin: string;
    readonly blocked: number;
    readonly stages: ReadonlyArray<DealStage>;
  };
  readonly dealDetails: Readonly<Record<string, DealDetailData>>;
};

export const NAVIGATION: ReadonlyArray<NavigationGroup> = [
  { title: 'Operación', items: [
    { label: 'Command Center', icon: 'gauge', view: 'command' },
    { label: 'Deals', icon: 'briefcase', view: 'pipeline', badgeKey: 'deals' },
    { label: 'Talentos', icon: 'user', href: '/admin/talents' },
    { label: 'Descubrimiento', icon: 'search', href: '/admin/targets' },
    { label: 'Leads y comunicaciones', icon: 'mail', href: '/admin/leads' },
    { label: 'Tareas y aprobaciones', icon: 'tasks', href: '/admin/tareas', badgeKey: 'tasks' },
    { label: 'Documentos', icon: 'file', href: '/admin/contratos' },
  ] },
  { title: 'Automatización', items: [
    { label: 'Automatizaciones', icon: 'workflow', href: '/admin/automation-drafts' },
    { label: 'Agentes', icon: 'bot', href: '/admin/agents', badgeKey: 'agents' },
  ] },
  { title: 'Inteligencia', items: [
    { label: 'Analítica e informes', icon: 'chart', href: '/admin/analytics' },
    { label: 'Finanzas', icon: 'euro', href: '/admin/finanzas/resumen' },
  ] },
  { title: 'Administración', items: [
    { label: 'Integraciones', icon: 'link', href: '/admin/entregables/fuentes' },
    { label: 'Equipo y permisos', icon: 'users', href: '/admin/equipo' },
    { label: 'Seguridad y auditoría', icon: 'shield', href: '/admin/seguridad' },
    { label: 'Configuración', icon: 'settings', href: '/admin/configuracion' },
  ] },
];
