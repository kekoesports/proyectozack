export type KekoPilotLocale = 'es' | 'en';

export type AgentCopy = {
  readonly code: string;
  readonly name: string;
  readonly summary: string;
  readonly input: string;
  readonly output: string;
  readonly guardrail: string;
  readonly event: string;
};

export type SolutionCopy = {
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly signal: string;
};

type KekoPilotCopy = {
  readonly localeLabel: string;
  readonly localeHref: string;
  readonly nav: ReadonlyArray<{ readonly href: string; readonly label: string }>;
  readonly login: string;
  readonly demo: string;
  readonly eyebrow: string;
  readonly titleLead: string;
  readonly titleAccent: string;
  readonly body: string;
  readonly secondaryCta: string;
  readonly footnote: string;
  readonly systemLabel: string;
  readonly graphAlt: string;
  readonly sourceLabel: string;
  readonly agentLabel: string;
  readonly outcomeLabel: string;
  readonly boot: ReadonlyArray<string>;
  readonly statuses: ReadonlyArray<string>;
  readonly architecture: {
    readonly kicker: string;
    readonly title: string;
    readonly hint: string;
    readonly rows: ReadonlyArray<{ readonly number: string; readonly label: string; readonly detail: string; readonly tag: string }>;
  };
  readonly flow: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly footnote: string;
    readonly steps: ReadonlyArray<{ readonly number: string; readonly owner: string; readonly title: string; readonly body: string }>;
  };
  readonly agents: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly capability: string;
    readonly input: string;
    readonly output: string;
    readonly guardrail: string;
    readonly activity: string;
    readonly items: ReadonlyArray<AgentCopy>;
  };
  readonly problems: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly items: ReadonlyArray<{ readonly title: string; readonly body: string }>;
  };
  readonly modules: {
    readonly kicker: string;
    readonly title: string;
    readonly columns: readonly [string, string, string];
    readonly items: ReadonlyArray<{ readonly name: string; readonly body: string; readonly status: 'beta' | 'soon' }>;
    readonly beta: string;
    readonly soon: string;
  };
  readonly trust: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly link: string;
    readonly logTitle: string;
    readonly items: ReadonlyArray<{ readonly title: string; readonly body: string }>;
  };
  readonly solutions: {
    readonly kicker: string;
    readonly title: string;
    readonly items: ReadonlyArray<SolutionCopy>;
  };
  readonly integrations: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly items: ReadonlyArray<{ readonly name: string; readonly body: string }>;
  };
  readonly closing: {
    readonly title: string;
    readonly body: string;
    readonly note: string;
  };
  readonly faq: {
    readonly kicker: string;
    readonly title: string;
    readonly items: ReadonlyArray<{ readonly question: string; readonly answer: string }>;
  };
  readonly footer: {
    readonly body: string;
    readonly columns: ReadonlyArray<{ readonly title: string; readonly links: ReadonlyArray<{ readonly href: string; readonly label: string }> }>;
    readonly legal: string;
  };
};

const COPY: Record<KekoPilotLocale, KekoPilotCopy> = {
  es: {
    localeLabel: 'EN',
    localeHref: '/en/kekopilot',
    nav: [
      { href: '#producto', label: 'Producto' },
      { href: '#flujo', label: 'Cómo funciona' },
      { href: '#agentes', label: 'Agentes' },
      { href: '#seguridad', label: 'Seguridad' },
    ],
    login: 'Acceder',
    demo: 'Agendar una demo',
    eyebrow: 'Operaciones asistidas por IA',
    titleLead: 'Tus operaciones,',
    titleAccent: 'bajo control.',
    body: 'KekoPilot reúne email, Discord, documentos, hojas de cálculo, acuerdos y facturas en un solo sistema operativo. Los agentes Zack ejecutan el proceso; tu equipo mantiene la decisión.',
    secondaryCta: 'Ver cómo funciona',
    footnote: 'Producto en beta privada. Acceso por solicitud y evaluación previa.',
    systemLabel: 'Núcleo operativo',
    graphAlt: 'Flujo de información desde las fuentes hacia KekoPilot, sus agentes especializados y un resultado aprobado.',
    sourceLabel: 'Fuentes',
    agentLabel: 'Agentes Zack',
    outcomeLabel: 'Resultado',
    boot: ['Conectando fuentes', 'Verificando permisos', 'Agentes en línea', 'Supervisión activa'],
    statuses: ['Sistema en línea', '4 agentes', 'Aprobación humana activa', 'Beta privada'],
    architecture: {
      kicker: 'Arquitectura', title: 'De información dispersa a un sistema que actúa', hint: 'Sigue el recorrido de una operación',
      rows: [
        { number: '01', label: 'Fuentes', detail: 'Discord · Correo · Hojas · Drive', tag: 'Entrada' },
        { number: '02', label: 'KekoPilot', detail: 'Registro único · Permisos · Auditoría', tag: 'Núcleo' },
        { number: '03', label: 'Agentes Zack', detail: 'CRM · Deal Clerk · Growth · SEO', tag: 'Ejecución' },
        { number: '04', label: 'Herramientas', detail: 'Documentos · Stripe · n8n', tag: 'Acción' },
        { number: '05', label: 'Resultado', detail: 'Deal cerrado · Factura conciliada · KPI', tag: 'Salida' },
      ],
    },
    flow: {
      kicker: 'Del mensaje a la ejecución', title: 'Un flujo, seis pasos, una sola fuente de verdad',
      body: 'El mismo recorrido que hoy vive repartido entre bandejas de entrada y hojas de cálculo, ejecutado en un único registro auditable.',
      footnote: 'Cada paso deja registro: quién lo propuso, quién lo aprobó y cuándo.',
      steps: [
        { number: '01', owner: 'Fuente', title: 'Mensaje', body: 'Llega un mensaje en Discord o un correo de un cliente.' },
        { number: '02', owner: 'Zack Deal Clerk', title: 'Detección', body: 'Identifica intención, importe y contraparte.' },
        { number: '03', owner: 'Zack CRM', title: 'Deal', body: 'Crea el acuerdo en el pipeline con sus campos y fechas.' },
        { number: '04', owner: 'Documentos', title: 'Documento', body: 'Genera contrato y hoja de seguimiento desde plantilla.' },
        { number: '05', owner: 'Zack CRM', title: 'Seguimiento', body: 'Activa recordatorios si el deal se queda sin actualizar.' },
        { number: '06', owner: 'Aprobación humana', title: 'Facturación', body: 'Propone factura y conciliación; aprueba una persona.' },
      ],
    },
    agents: {
      kicker: 'Familia de agentes', title: 'Zack: agentes especializados, no un chatbot',
      body: 'Cada agente cubre un dominio concreto de la operación, con permisos propios y acciones que requieren aprobación humana. La familia puede crecer sin rehacer el sistema.',
      capability: 'Capacidad', input: 'Lee', output: 'Prepara', guardrail: 'Límite', activity: 'Actividad reciente',
      items: [
        { code: 'ZACK / 01', name: 'Zack CRM', summary: 'Supervisa datos, tareas, actividad y salud operativa. Avisa de lo que lleva demasiado tiempo parado.', input: 'Deals, tareas y actividad', output: 'Alertas y prioridades', guardrail: 'No cambia estados críticos', event: 'Acuerdos pendientes detectados' },
        { code: 'ZACK / 02', name: 'Zack Deal Clerk', summary: 'Interpreta conversaciones y propone crear o actualizar acuerdos con sus importes y plazos.', input: 'Email y Discord', output: 'Borradores de deal', guardrail: 'No envía ni confirma acuerdos', event: 'Conversación convertida en borrador' },
        { code: 'ZACK / 03', name: 'Zack Growth', summary: 'Descubre oportunidades, creadores y medios.', input: 'Fuentes públicas autorizadas', output: 'Listas cualificadas', guardrail: 'No contacta sin aprobación', event: 'Perfiles listos para validar' },
        { code: 'ZACK / 04', name: 'Zack SEO', summary: 'Monitoriza contenido, rendimiento e indexación.', input: 'Contenido y Search Console', output: 'Briefs y recomendaciones', guardrail: 'No publica contenido', event: 'Oportunidad de contenido detectada' },
      ],
    },
    problems: {
      kicker: 'El cambio operativo', title: 'Menos perseguir. Más decidir.',
      body: 'No necesitas otro dashboard que mirar. Necesitas que el trabajo llegue ordenado, con contexto y una siguiente acción clara.',
      items: [
        { title: 'Nada importante se queda en un chat', body: 'Una conversación relevante se convierte en un borrador trazable, listo para revisar.' },
        { title: 'Una sola versión del trabajo', body: 'Deals, documentos, tareas y facturas comparten el mismo contexto.' },
        { title: 'Los bloqueos aparecen antes', body: 'La cola prioriza lo que se ha detenido y señala la siguiente acción.' },
        { title: 'Cada decisión conserva su evidencia', body: 'Queda registrado quién propuso, quién aprobó y qué información utilizó.' },
      ],
    },
    modules: {
      kicker: 'Una sola superficie', title: 'Módulos del producto', columns: ['Módulo', 'Qué hace', 'Estado'], beta: 'Beta privada', soon: 'Próximamente',
      items: [
        { name: 'Deals y pipeline', body: 'Estados, importes, contrapartes y responsables en un registro único.', status: 'beta' },
        { name: 'Documentos', body: 'Contratos y hojas de seguimiento generados desde plantilla.', status: 'beta' },
        { name: 'Informes KPI', body: 'Resúmenes operativos y métricas por periodo, equipo y cliente.', status: 'beta' },
        { name: 'Facturación', body: 'Emisión y conciliación con aprobación humana obligatoria.', status: 'beta' },
        { name: 'Talentos y estadísticas', body: 'Fichas y datos multicanal de las personas que representas.', status: 'beta' },
        { name: 'Leads y correo', body: 'Captación, respuestas propuestas y seguimiento del hilo.', status: 'beta' },
        { name: 'Calendario editorial', body: 'Contenido, noticias y prensa planificados en un calendario.', status: 'beta' },
        { name: 'Automatizaciones n8n', body: 'Flujos propios conectados a los disparadores del sistema.', status: 'beta' },
        { name: 'Agentes adicionales', body: 'Nuevos especialistas sobre la misma base de permisos.', status: 'soon' },
        { name: 'Multi-idioma y multi-divisa', body: 'Operación internacional con divisa e idioma por cliente.', status: 'soon' },
      ],
    },
    trust: {
      kicker: 'Supervisión y seguridad', title: 'Ninguna acción sin una persona.',
      body: 'Ninguna acción con impacto económico o contractual se ejecuta sin aprobación humana. Todo lo que hace un agente queda registrado y es reversible.',
      link: 'Ver cómo protegemos los datos', logTitle: 'Registro de control',
      items: [
        { title: 'Aprobación humana obligatoria', body: 'Facturas, contratos y envíos externos requieren confirmación.' },
        { title: 'Roles y permisos', body: 'Cada agente y cada persona ve solo lo que le corresponde.' },
        { title: '2FA', body: 'Segundo factor en el acceso a la aplicación.' },
        { title: 'Auditoría', body: 'Registro por usuario, agente, acción y momento.' },
        { title: 'Backups', body: 'Copias periódicas y procedimiento de restauración.' },
      ],
    },
    solutions: {
      kicker: 'Casos de uso', title: 'Según quién opera',
      items: [
        { label: 'Agencias', title: 'De la conversación al cobro', body: 'Pipeline, talentos y facturación en un mismo registro, con recordatorios cuando algo se detiene.', signal: 'Pipeline sincronizado' },
        { label: 'Marcas', title: 'Campañas sin hojas paralelas', body: 'Entregables, aprobaciones y conciliación con proveedores en un flujo trazable.', signal: 'Entregables bajo control' },
        { label: 'Creadores y managers', title: 'Tus acuerdos, ordenados', body: 'Un sitio donde vive cada acuerdo, su documento y su estado de pago.', signal: 'Contexto unificado' },
        { label: 'Equipos de operaciones', title: 'Un proceso, no diez bandejas', body: 'Detección de trabajo entrante, cola priorizada y KPI del propio sistema.', signal: 'Supervisión activa' },
      ],
    },
    integrations: {
      kicker: 'Integraciones', title: 'Conecta las herramientas donde ya trabaja tu equipo',
      body: 'Las integraciones listadas están en desarrollo dentro de la beta privada. En la sesión de demo confirmamos cuáles encajan con tu operación.',
      items: [
        { name: 'Discord', body: 'Mensajes y actividad' }, { name: 'Gmail', body: 'Correo y leads' },
        { name: 'Google Sheets', body: 'Hojas de seguimiento' }, { name: 'Google Drive', body: 'Documentos y contratos' },
        { name: 'Stripe', body: 'Cobros y conciliación' }, { name: 'n8n', body: 'Automatizaciones propias' },
        { name: 'YouTube', body: 'Estadísticas de canal' }, { name: 'Twitch', body: 'Estadísticas de canal' },
      ],
    },
    closing: { title: 'Un sistema operativo. Agentes de IA especializados.', body: 'Cuéntanos cómo funciona hoy tu operación y te mostramos el flujo completo sobre datos reales en una sesión de 30 minutos.', note: 'Plazas limitadas durante la beta privada.' },
    faq: {
      kicker: 'Antes de la demo', title: 'Las preguntas que importan',
      items: [
        { question: '¿KekoPilot sustituye las herramientas que ya usamos?', answer: 'No. Se conecta a las fuentes donde ya trabaja tu equipo y crea una capa operativa común sobre ellas.' },
        { question: '¿Qué puede hacer un agente sin aprobación?', answer: 'Puede leer, ordenar, detectar y preparar propuestas. Las acciones económicas, contractuales o externas requieren confirmación humana.' },
        { question: '¿Cómo empieza la implantación?', answer: 'La beta comienza con un flujo acotado y medible. Cuando ese recorrido funciona, se amplía a nuevos procesos y agentes.' },
        { question: '¿Para qué equipos tiene más sentido?', answer: 'Para agencias, managers y equipos de operaciones que coordinan deals, campañas, documentos y facturación entre chats y hojas.' },
      ],
    },
    footer: {
      body: 'Plataforma de operaciones asistidas por IA, desarrollada desde la experiencia operativa de SocialPro.', legal: '© 2026 KekoPilot · Beta privada',
      columns: [
        { title: 'Producto', links: [{ href: '#producto', label: 'Producto' }, { href: '#flujo', label: 'Flujo' }, { href: '#agentes', label: 'Agentes Zack' }] },
        { title: 'Control', links: [{ href: '#seguridad', label: 'Seguridad' }, { href: '#modulos', label: 'Módulos' }, { href: '#integraciones', label: 'Integraciones' }] },
      ],
    },
  },
  en: {
    localeLabel: 'ES',
    localeHref: '/kekopilot',
    nav: [
      { href: '#product', label: 'Product' },
      { href: '#flow', label: 'How it works' },
      { href: '#agents', label: 'Agents' },
      { href: '#security', label: 'Security' },
    ],
    login: 'Sign in',
    demo: 'Book a demo',
    eyebrow: 'AI-assisted operations',
    titleLead: 'Your operations,',
    titleAccent: 'under control.',
    body: 'KekoPilot brings email, Discord, documents, spreadsheets, deals and invoices into one operating system. Zack agents run the process; your team keeps the decision.',
    secondaryCta: 'See how it works',
    footnote: 'Private beta. Access by request, after a short evaluation.',
    systemLabel: 'Operational core',
    graphAlt: 'Information flowing from sources into KekoPilot, its specialised agents and a human-approved outcome.',
    sourceLabel: 'Sources',
    agentLabel: 'Zack agents',
    outcomeLabel: 'Outcome',
    boot: ['Connecting sources', 'Checking permissions', 'Agents online', 'Oversight active'],
    statuses: ['System online', '4 agents', 'Human approval on', 'Private beta'],
    architecture: {
      kicker: 'Architecture', title: 'From scattered information to a system that acts', hint: 'Follow one operation end to end',
      rows: [
        { number: '01', label: 'Sources', detail: 'Discord · Email · Sheets · Drive', tag: 'Input' },
        { number: '02', label: 'KekoPilot', detail: 'Single record · Permissions · Audit', tag: 'Core' },
        { number: '03', label: 'Zack agents', detail: 'CRM · Deal Clerk · Growth · SEO', tag: 'Execution' },
        { number: '04', label: 'Tools', detail: 'Documents · Stripe · n8n', tag: 'Action' },
        { number: '05', label: 'Outcome', detail: 'Closed deal · Reconciled invoice · KPI', tag: 'Output' },
      ],
    },
    flow: {
      kicker: 'From conversation to execution', title: 'One flow, six steps, a single source of truth',
      body: 'The same path that today lives scattered across inboxes and spreadsheets, executed in one auditable record.',
      footnote: 'Every step is logged: who proposed it, who approved it, and when.',
      steps: [
        { number: '01', owner: 'Source', title: 'Message', body: 'A client message arrives through Discord or email.' },
        { number: '02', owner: 'Zack Deal Clerk', title: 'Detection', body: 'Identifies intent, value and counterpart.' },
        { number: '03', owner: 'Zack CRM', title: 'Deal', body: 'Creates the deal in the pipeline with its fields and dates.' },
        { number: '04', owner: 'Documents', title: 'Document', body: 'Generates the contract and tracking sheet from a template.' },
        { number: '05', owner: 'Zack CRM', title: 'Follow-up', body: 'Triggers reminders when a deal stops being updated.' },
        { number: '06', owner: 'Human approval', title: 'Billing', body: 'Proposes invoice and reconciliation; a person approves.' },
      ],
    },
    agents: {
      kicker: 'Agent family', title: 'Zack: specialised agents, not a chatbot',
      body: 'Each agent covers one operational domain, with its own permissions and actions that require human approval. The family can grow without rebuilding the system.',
      capability: 'Capability', input: 'Reads', output: 'Prepares', guardrail: 'Limit', activity: 'Recent activity',
      items: [
        { code: 'ZACK / 01', name: 'Zack CRM', summary: 'Monitors data, tasks, activity and operational health. Flags work that has been idle for too long.', input: 'Deals, tasks and activity', output: 'Alerts and priorities', guardrail: 'Cannot change critical states', event: 'Pending deals detected' },
        { code: 'ZACK / 02', name: 'Zack Deal Clerk', summary: 'Interprets conversations and proposes creating or updating deals with amounts and deadlines.', input: 'Email and Discord', output: 'Deal drafts', guardrail: 'Cannot send or confirm agreements', event: 'Conversation converted to draft' },
        { code: 'ZACK / 03', name: 'Zack Growth', summary: 'Finds opportunities, creators and media.', input: 'Approved public sources', output: 'Qualified lists', guardrail: 'Cannot contact without approval', event: 'Profiles ready to validate' },
        { code: 'ZACK / 04', name: 'Zack SEO', summary: 'Monitors content, performance and indexing.', input: 'Content and Search Console', output: 'Briefs and recommendations', guardrail: 'Cannot publish content', event: 'Content opportunity detected' },
      ],
    },
    problems: {
      kicker: 'The operational shift', title: 'Less chasing. More deciding.',
      body: 'You do not need another dashboard to watch. You need work to arrive organised, in context, with a clear next action.',
      items: [
        { title: 'Nothing important stays in chat', body: 'A relevant conversation becomes a traceable draft, ready to review.' },
        { title: 'One version of the work', body: 'Deals, documents, tasks and invoices share the same context.' },
        { title: 'Blockers surface earlier', body: 'The queue prioritises stalled work and points to the next action.' },
        { title: 'Every decision keeps its evidence', body: 'The record shows who proposed, who approved and which information was used.' },
      ],
    },
    modules: {
      kicker: 'One operating surface', title: 'Product modules', columns: ['Module', 'What it does', 'Status'], beta: 'Private beta', soon: 'Coming soon',
      items: [
        { name: 'Deals and pipeline', body: 'Stages, amounts, counterparties and owners in one record.', status: 'beta' },
        { name: 'Documents', body: 'Contracts and tracking sheets generated from templates.', status: 'beta' },
        { name: 'KPI reports', body: 'Operational summaries and metrics by period, team and client.', status: 'beta' },
        { name: 'Billing', body: 'Issuing and reconciliation with required human approval.', status: 'beta' },
        { name: 'Talent and statistics', body: 'Profiles and multi-channel data for the people you represent.', status: 'beta' },
        { name: 'Leads and email', body: 'Capture, proposed replies and thread follow-up.', status: 'beta' },
        { name: 'Editorial calendar', body: 'Content, news and press planned in one calendar.', status: 'beta' },
        { name: 'n8n automations', body: 'Custom flows connected to system triggers.', status: 'beta' },
        { name: 'Additional agents', body: 'New specialists on the same permission model.', status: 'soon' },
        { name: 'Multi-language and currency', body: 'International operations with language and currency per client.', status: 'soon' },
      ],
    },
    trust: {
      kicker: 'Oversight and security', title: 'Nothing runs without a person.',
      body: 'No action with financial or contractual impact runs without human approval. Everything an agent does is logged and reversible.',
      link: 'See how we protect data', logTitle: 'Control log',
      items: [
        { title: 'Human approval required', body: 'Invoices, contracts and external sends require confirmation.' },
        { title: 'Roles and permissions', body: 'Each agent and person only sees what they need.' },
        { title: '2FA', body: 'A second factor protects access to the application.' },
        { title: 'Audit trail', body: 'Records user, agent, action and time.' },
        { title: 'Backups', body: 'Periodic copies and a documented restore procedure.' },
      ],
    },
    solutions: {
      kicker: 'Use cases', title: 'Depending on who operates',
      items: [
        { label: 'Agencies', title: 'From conversation to payment', body: 'Pipeline, talent and billing in one record, with reminders when work stalls.', signal: 'Pipeline synced' },
        { label: 'Brands', title: 'Campaigns without parallel sheets', body: 'Deliverables, approvals and supplier reconciliation in one traceable flow.', signal: 'Deliverables under control' },
        { label: 'Creators and managers', title: 'Your deals, organised', body: 'One place for every deal, its documents and its payment status.', signal: 'Context unified' },
        { label: 'Operations teams', title: 'One process, not ten inboxes', body: 'Incoming work detection, a prioritised queue and system-level KPIs.', signal: 'Oversight active' },
      ],
    },
    integrations: {
      kicker: 'Integrations', title: 'Connect the tools your team already works in',
      body: 'The listed integrations are in development within the private beta. During the demo we confirm which ones fit your operation.',
      items: [
        { name: 'Discord', body: 'Messages and activity' }, { name: 'Gmail', body: 'Email and leads' },
        { name: 'Google Sheets', body: 'Tracking sheets' }, { name: 'Google Drive', body: 'Documents and contracts' },
        { name: 'Stripe', body: 'Payments and reconciliation' }, { name: 'n8n', body: 'Custom automations' },
        { name: 'YouTube', body: 'Channel statistics' }, { name: 'Twitch', body: 'Channel statistics' },
      ],
    },
    closing: { title: 'One operational system. Specialised AI agents.', body: 'Tell us how your operation runs today and we will walk the full flow on real data in a 30-minute session.', note: 'Limited places during the private beta.' },
    faq: {
      kicker: 'Before the demo', title: 'The questions that matter',
      items: [
        { question: 'Does KekoPilot replace the tools we already use?', answer: 'No. It connects to the sources where your team already works and creates one operational layer across them.' },
        { question: 'What can an agent do without approval?', answer: 'It can read, structure, detect and prepare proposals. Financial, contractual or external actions require human confirmation.' },
        { question: 'How does implementation begin?', answer: 'The beta starts with one bounded, measurable workflow. Once it works, the system expands to more processes and agents.' },
        { question: 'Which teams benefit most?', answer: 'Agencies, managers and operations teams coordinating deals, campaigns, documents and billing across chat and spreadsheets.' },
      ],
    },
    footer: {
      body: 'AI-assisted operations platform, developed from SocialPro’s operating experience.', legal: '© 2026 KekoPilot · Private beta',
      columns: [
        { title: 'Product', links: [{ href: '#product', label: 'Product' }, { href: '#flow', label: 'Flow' }, { href: '#agents', label: 'Zack agents' }] },
        { title: 'Control', links: [{ href: '#security', label: 'Security' }, { href: '#modules', label: 'Modules' }, { href: '#integrations', label: 'Integrations' }] },
      ],
    },
  },
};

export function getHeroCopy(locale: KekoPilotLocale): KekoPilotCopy {
  return COPY[locale];
}

export const DEMO_HREF = 'mailto:marketing@socialpro.es?subject=Demo%20KekoPilot';
export const SOCIALPRO_URL = 'https://socialpro.es';
