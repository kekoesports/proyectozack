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
    localeHref: '/en',
    nav: [
      { href: '#beneficios', label: 'Beneficios' },
      { href: '#flujo', label: 'Cómo funciona' },
      { href: '#agentes', label: 'Agentes' },
      { href: '#seguridad', label: 'Seguridad' },
    ],
    login: 'Acceder',
    demo: 'Ver KekoPilot en acción',
    eyebrow: 'Operaciones asistidas por IA para agencias y equipos',
    titleLead: 'Tu operación avanza.',
    titleAccent: 'Tú decides.',
    body: 'KekoPilot convierte conversaciones, documentos y hojas dispersas en trabajo listo para revisar. Los agentes Zack preparan deals, seguimiento y facturación; tu equipo aprueba las decisiones importantes.',
    secondaryCta: 'Ver un flujo real',
    footnote: 'Demo guiada de 30 minutos · Acceso beta por invitación.',
    systemLabel: 'Núcleo operativo',
    graphAlt: 'Flujo de información desde las fuentes hacia KekoPilot, sus agentes especializados y un resultado aprobado.',
    sourceLabel: 'Fuentes',
    agentLabel: 'Agentes Zack',
    outcomeLabel: 'Resultado',
    boot: ['Conectando fuentes', 'Verificando permisos', 'Agentes en línea', 'Supervisión activa'],
    statuses: ['Fuentes conectadas', 'Trabajo priorizado', 'Evidencia visible', 'Tú apruebas'],
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
      kicker: 'Del mensaje al cobro', title: 'Un acuerdo avanza sin perseguir seis herramientas',
      body: 'KekoPilot reúne cada paso en un registro auditable y lleva la siguiente decisión a la persona adecuada.',
      footnote: 'Cada paso deja registro: quién lo propuso, quién lo aprobó y cuándo.',
      steps: [
        { number: '01', owner: 'Fuente', title: 'Mensaje', body: 'Llega un mensaje en Discord o un correo de un cliente.' },
        { number: '02', owner: 'Zack Deal Clerk', title: 'Detección', body: 'Identifica intención, importe y contraparte.' },
        { number: '03', owner: 'Zack CRM', title: 'Deal', body: 'Crea un borrador en el pipeline con campos y fechas.' },
        { number: '04', owner: 'Documentos', title: 'Documento', body: 'Prepara contrato y hoja de seguimiento desde plantilla.' },
        { number: '05', owner: 'Zack CRM', title: 'Seguimiento', body: 'Prioriza recordatorios si el acuerdo se detiene.' },
        { number: '06', owner: 'Aprobación humana', title: 'Facturación', body: 'Propone factura y conciliación; aprueba una persona.' },
      ],
    },
    agents: {
      kicker: 'Familia de agentes', title: 'Cada agente hace un trabajo concreto. Ninguno decide por ti.',
      body: 'Cada especialista cubre un dominio, trabaja con permisos propios y entrega una propuesta acompañada de evidencia.',
      capability: 'Capacidad', input: 'Lee', output: 'Prepara', guardrail: 'Límite', activity: 'Actividad reciente',
      items: [
        { code: 'ZACK / 01', name: 'Zack CRM', summary: 'Supervisa datos, tareas y salud operativa.', input: 'Deals, tareas y actividad', output: 'Alertas y prioridades', guardrail: 'No cambia estados críticos', event: 'Acuerdos pendientes detectados' },
        { code: 'ZACK / 02', name: 'Zack Deal Clerk', summary: 'Interpreta conversaciones y estructura oportunidades.', input: 'Email y Discord', output: 'Borradores de deal', guardrail: 'No envía ni confirma acuerdos', event: 'Conversación convertida en borrador' },
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
      kicker: 'Una sola superficie', title: 'Todo el contexto, listo cuando lo necesitas', columns: ['Módulo', 'Qué resuelve', 'Estado'], beta: 'Incluido en la beta', soon: 'En desarrollo',
      items: [
        { name: 'Centro de control', body: 'Salud operativa, alertas, aprobaciones y siguiente acción.', status: 'beta' },
        { name: 'Acuerdos', body: 'Pipeline, entregables, documentos y actividad en un registro.', status: 'beta' },
        { name: 'Creadores', body: 'Perfiles, redes, rendimiento e histórico operativo.', status: 'beta' },
        { name: 'Tareas y aprobaciones', body: 'Trabajo recurrente y decisiones pendientes.', status: 'beta' },
        { name: 'Documentos', body: 'Contratos, facturas y plantillas vinculadas al contexto.', status: 'beta' },
        { name: 'Automatizaciones', body: 'Flujos n8n con disparadores y puntos de control.', status: 'beta' },
        { name: 'Analítica y finanzas', body: 'KPI, conciliación y trazabilidad financiera.', status: 'beta' },
        { name: 'Nuevos agentes', body: 'Especialistas adicionales sobre la misma base de permisos.', status: 'soon' },
      ],
    },
    trust: {
      kicker: 'Supervisión y seguridad', title: 'Automatiza el proceso. Conserva la decisión.',
      body: 'Ninguna acción con impacto económico, contractual o externo se ejecuta sin aprobación humana. La evidencia permanece junto a la propuesta.',
      link: 'Ver el modelo de control', logTitle: 'Registro de control',
      items: [
        { title: 'Aprobación humana obligatoria', body: 'Facturas, contratos y envíos externos requieren confirmación.' },
        { title: 'Roles y permisos', body: 'Cada agente y persona accede solo a su contexto.' },
        { title: 'Auditoría', body: 'Registro por usuario, agente, acción y momento.' },
        { title: 'Backups', body: 'Copias periódicas y procedimiento de restauración.' },
      ],
    },
    solutions: {
      kicker: 'Según quién opera', title: 'Un producto, cuatro formas de recuperar control',
      items: [
        { label: 'Agencias', title: 'De la conversación al cobro', body: 'Pipeline, talento y facturación en un registro, con alertas cuando algo se detiene.', signal: 'Pipeline sincronizado' },
        { label: 'Marcas', title: 'Campañas sin hojas paralelas', body: 'Entregables, aprobaciones y proveedores dentro del mismo flujo auditable.', signal: 'Entregables bajo control' },
        { label: 'Managers', title: 'Cada creador, con contexto', body: 'Acuerdos, estadísticas, documentos y tareas conectados al perfil correcto.', signal: 'Contexto unificado' },
        { label: 'Operaciones', title: 'La excepción llega antes', body: 'El Command Center prioriza bloqueos, riesgo y decisiones pendientes.', signal: 'Supervisión activa' },
      ],
    },
    integrations: {
      kicker: 'Integraciones', title: 'Trabaja donde ya está tu equipo',
      body: 'Conecta las fuentes que ya contienen tu operación. La disponibilidad de cada integración se confirma en la sesión de diagnóstico.',
      items: [
        { name: 'Discord', body: 'Mensajes y actividad' }, { name: 'Gmail', body: 'Correo y leads' },
        { name: 'Google Sheets', body: 'Hojas de seguimiento' }, { name: 'Google Drive', body: 'Documentos y contratos' },
        { name: 'Stripe', body: 'Cobros y conciliación' }, { name: 'n8n', body: 'Automatizaciones propias' },
        { name: 'YouTube', body: 'Estadísticas de canal' }, { name: 'Twitch', body: 'Estadísticas de canal' },
      ],
    },
    closing: { title: 'Enséñanos dónde se atasca tu operación.', body: 'En una sesión de 30 minutos convertimos un flujo real de tu equipo en una propuesta clara dentro de KekoPilot.', note: 'Sin compromiso · Sobre un caso real de tu equipo.' },
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
        { title: 'Producto', links: [{ href: '#producto', label: 'Arquitectura' }, { href: '#flujo', label: 'Flujo' }, { href: '#agentes', label: 'Agentes Zack' }] },
        { title: 'Control', links: [{ href: '#seguridad', label: 'Seguridad' }, { href: '#modulos', label: 'Módulos' }, { href: '#integraciones', label: 'Integraciones' }] },
      ],
    },
  },
  en: {
    localeLabel: 'ES',
    localeHref: '/',
    nav: [
      { href: '#benefits', label: 'Benefits' },
      { href: '#flow', label: 'How it works' },
      { href: '#agents', label: 'Agents' },
      { href: '#security', label: 'Security' },
    ],
    login: 'Sign in',
    demo: 'See KekoPilot in action',
    eyebrow: 'AI-assisted operations for agencies and teams',
    titleLead: 'Work keeps moving.',
    titleAccent: 'You decide.',
    body: 'KekoPilot turns scattered conversations, documents and spreadsheets into work that is ready to review. Zack agents prepare deals, follow-up and billing; your team approves the important decisions.',
    secondaryCta: 'See a real workflow',
    footnote: '30-minute guided demo · Private beta by invitation.',
    systemLabel: 'Operational core',
    graphAlt: 'Information flowing from sources into KekoPilot, its specialised agents and a human-approved outcome.',
    sourceLabel: 'Sources',
    agentLabel: 'Zack agents',
    outcomeLabel: 'Outcome',
    boot: ['Connecting sources', 'Checking permissions', 'Agents online', 'Oversight active'],
    statuses: ['Sources connected', 'Work prioritised', 'Evidence visible', 'You approve'],
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
      kicker: 'From message to payment', title: 'One deal moves forward without chasing six tools',
      body: 'KekoPilot brings every step into one auditable record and puts the next decision in front of the right person.',
      footnote: 'Every step is logged: who proposed it, who approved it, and when.',
      steps: [
        { number: '01', owner: 'Source', title: 'Message', body: 'A client message arrives through Discord or email.' },
        { number: '02', owner: 'Zack Deal Clerk', title: 'Detection', body: 'Identifies intent, value and counterpart.' },
        { number: '03', owner: 'Zack CRM', title: 'Deal', body: 'Creates a pipeline draft with fields and dates.' },
        { number: '04', owner: 'Documents', title: 'Document', body: 'Prepares the contract and tracking sheet from a template.' },
        { number: '05', owner: 'Zack CRM', title: 'Follow-up', body: 'Prioritises reminders when a deal stops moving.' },
        { number: '06', owner: 'Human approval', title: 'Billing', body: 'Proposes invoice and reconciliation; a person approves.' },
      ],
    },
    agents: {
      kicker: 'Agent family', title: 'Each agent does one concrete job. None decides for you.',
      body: 'Each specialist owns one domain, works with scoped permissions and delivers a proposal backed by evidence.',
      capability: 'Capability', input: 'Reads', output: 'Prepares', guardrail: 'Limit', activity: 'Recent activity',
      items: [
        { code: 'ZACK / 01', name: 'Zack CRM', summary: 'Monitors data, tasks and operational health.', input: 'Deals, tasks and activity', output: 'Alerts and priorities', guardrail: 'Cannot change critical states', event: 'Pending deals detected' },
        { code: 'ZACK / 02', name: 'Zack Deal Clerk', summary: 'Interprets conversations and structures opportunities.', input: 'Email and Discord', output: 'Deal drafts', guardrail: 'Cannot send or confirm agreements', event: 'Conversation converted to draft' },
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
      kicker: 'One operating surface', title: 'All the context, ready when you need it', columns: ['Module', 'What it solves', 'Status'], beta: 'Included in beta', soon: 'In development',
      items: [
        { name: 'Command Center', body: 'Operational health, alerts, approvals and the next action.', status: 'beta' },
        { name: 'Deals', body: 'Pipeline, deliverables, documents and activity in one record.', status: 'beta' },
        { name: 'Creators', body: 'Profiles, networks, performance and operational history.', status: 'beta' },
        { name: 'Tasks & Approvals', body: 'Recurring work and pending decisions.', status: 'beta' },
        { name: 'Documents', body: 'Contracts, invoices and templates linked to context.', status: 'beta' },
        { name: 'Automations', body: 'n8n flows with triggers and control points.', status: 'beta' },
        { name: 'Analytics & Finance', body: 'KPIs, reconciliation and financial traceability.', status: 'beta' },
        { name: 'Additional agents', body: 'New specialists on the same permission model.', status: 'soon' },
      ],
    },
    trust: {
      kicker: 'Oversight and security', title: 'Automate the process. Keep the decision.',
      body: 'No financial, contractual or external action runs without human approval. The evidence stays next to the proposal.',
      link: 'See the control model', logTitle: 'Control log',
      items: [
        { title: 'Human approval required', body: 'Invoices, contracts and external sends require confirmation.' },
        { title: 'Roles and permissions', body: 'Each agent and person only sees their context.' },
        { title: 'Audit trail', body: 'Records user, agent, action and time.' },
        { title: 'Backups', body: 'Periodic copies and a documented restore procedure.' },
      ],
    },
    solutions: {
      kicker: 'Built for operators', title: 'One product, four ways to regain control',
      items: [
        { label: 'Agencies', title: 'From conversation to payment', body: 'Pipeline, talent and billing in one record, with alerts when work stalls.', signal: 'Pipeline synced' },
        { label: 'Brands', title: 'Campaigns without parallel sheets', body: 'Deliverables, approvals and suppliers inside one auditable flow.', signal: 'Deliverables under control' },
        { label: 'Managers', title: 'Every creator in context', body: 'Deals, statistics, documents and tasks connected to the right profile.', signal: 'Context unified' },
        { label: 'Operations', title: 'Exceptions surface early', body: 'Command Center prioritises blockers, risk and pending decisions.', signal: 'Oversight active' },
      ],
    },
    integrations: {
      kicker: 'Integrations', title: 'Work where your team already works',
      body: 'Connect the sources that already contain your operation. Integration availability is confirmed during the discovery session.',
      items: [
        { name: 'Discord', body: 'Messages and activity' }, { name: 'Gmail', body: 'Email and leads' },
        { name: 'Google Sheets', body: 'Tracking sheets' }, { name: 'Google Drive', body: 'Documents and contracts' },
        { name: 'Stripe', body: 'Payments and reconciliation' }, { name: 'n8n', body: 'Custom automations' },
        { name: 'YouTube', body: 'Channel statistics' }, { name: 'Twitch', body: 'Channel statistics' },
      ],
    },
    closing: { title: 'Show us where your operation gets stuck.', body: 'In 30 minutes, we turn one real workflow from your team into a clear KekoPilot proposal.', note: 'No commitment · Built around a real case from your team.' },
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
        { title: 'Product', links: [{ href: '#product', label: 'Architecture' }, { href: '#flow', label: 'Flow' }, { href: '#agents', label: 'Zack agents' }] },
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
