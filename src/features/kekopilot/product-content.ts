import type { KekoPilotLocale } from './content';

export type ProductTone = 'pending' | 'draft' | 'error' | 'info' | 'done' | 'live';

type ProductCopy = {
  readonly promise: {
    readonly lineOne: string;
    readonly lineTwo: string;
    readonly body: string;
    readonly rules: ReadonlyArray<{ readonly label: string; readonly title: string; readonly body: string }>;
  };
  readonly showcase: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly demoLabel: string;
    readonly notesLabel: string;
    readonly disclaimer: string;
    readonly screens: ReadonlyArray<{
      readonly title: string;
      readonly crumb: string;
      readonly notes: ReadonlyArray<{ readonly number: string; readonly title: string; readonly body: string }>;
    }>;
    readonly summary: ReadonlyArray<{ readonly number: string; readonly title: string; readonly body: string }>;
  };
  readonly queue: ReadonlyArray<{
    readonly status: string;
    readonly tone: ProductTone;
    readonly agent: string;
    readonly title: string;
  }>;
  readonly pipeline: ReadonlyArray<{
    readonly name: string;
    readonly total: string;
    readonly deals: ReadonlyArray<{
      readonly reference: string;
      readonly creator: string;
      readonly brand: string;
      readonly status: string;
      readonly tone: ProductTone;
      readonly amount: string;
      readonly alert: string;
      readonly progress: string;
    }>;
  }>;
  readonly deal: {
    readonly stage: string;
    readonly creator: string;
    readonly brand: string;
    readonly figures: ReadonlyArray<{ readonly label: string; readonly value: string }>;
    readonly approval: string;
    readonly deliverablesLabel: string;
    readonly deliverables: ReadonlyArray<{ readonly title: string; readonly date: string; readonly status: string; readonly done: boolean }>;
    readonly activityLabel: string;
    readonly activity: ReadonlyArray<{ readonly status: string; readonly tone: ProductTone; readonly when: string; readonly text: string }>;
  };
  readonly socialProof: {
    readonly label: string;
    readonly body: string;
    readonly link: string;
  };
};

export type ProductConsoleCopy = Pick<ProductCopy, 'showcase' | 'queue' | 'pipeline' | 'deal'>;

const PRODUCT_COPY: Record<KekoPilotLocale, ProductCopy> = {
  es: {
    promise: {
      lineOne: 'Automatiza el proceso.',
      lineTwo: 'Conserva la decisión.',
      body: 'Los agentes preparan, proponen y documentan. Cada acción con impacto económico, contractual o externo espera a una persona.',
      rules: [
        { label: 'Regla 01', title: 'Propone, no decide', body: 'Los agentes preparan borradores y propuestas con su evidencia. Nunca ejecutan por su cuenta.' },
        { label: 'Regla 02', title: 'Aprobación con contexto', body: 'Cada propuesta muestra qué cambia, de dónde sale y quién puede aprobarla.' },
        { label: 'Regla 03', title: 'Todo queda registrado', body: 'Personas y agentes comparten la misma auditoría, con autor y hora.' },
      ],
    },
    showcase: {
      kicker: 'Dentro del producto',
      title: 'Así se ve la operación por dentro',
      body: 'Tres pantallas resumen el producto: la cola de decisiones, el pipeline y la ficha de deal. Cada una muestra el contexto que la diferencia de un CRM convencional.',
      demoLabel: 'Datos de demostración',
      notesLabel: 'Qué mirar',
      disclaimer: 'Pantallas de demostración con datos ficticios. La interfaz real se muestra en la sesión de demo.',
      screens: [
        {
          title: 'Cola de decisiones',
          crumb: 'Command Center',
          notes: [
            { number: '1', title: 'Una propuesta, una tarjeta', body: 'Cada acción de Zack tiene estado propio y nunca se confunde con algo ya ejecutado.' },
            { number: '2', title: 'El cambio, antes de aprobar', body: 'La evidencia queda enlazada a su fuente para revisar el contexto completo.' },
            { number: '3', title: 'Quién decide', body: 'El botón solo aparece a quien tiene permiso. Sin aprobación no hay emisión.' },
          ],
        },
        {
          title: 'Pipeline',
          crumb: 'Deals · Pipeline',
          notes: [
            { number: '1', title: 'Creador primero', body: 'La tarjeta ordena por talento y después por marca: así trabaja una agencia.' },
            { number: '2', title: 'Una alerta por deal', body: 'Bloqueos, hojas estancadas o facturas en espera, sin ruido añadido.' },
            { number: '3', title: 'Estados inequívocos', body: 'Lo preparado por un agente se distingue de lo aprobado a simple vista.' },
          ],
        },
        {
          title: 'Ficha de deal',
          crumb: 'Deals · KP-1042',
          notes: [
            { number: '1', title: 'Cabecera con lo esencial', body: 'Importe, margen, responsable y estado accesibles de inmediato.' },
            { number: '2', title: 'Lo pendiente, arriba', body: 'La propuesta que espera decisión ocupa la franja más visible.' },
            { number: '3', title: 'Actividad con evidencia', body: 'Información, borrador, pendiente, ejecutada o error: siempre etiquetado.' },
          ],
        },
      ],
      summary: [
        { number: '01', title: 'Cola de decisiones', body: 'Cada propuesta muestra qué cambia, con qué evidencia y quién puede aprobarla.' },
        { number: '02', title: 'Pipeline', body: 'Creador primero, marca después; importe, responsable y una alerta por deal.' },
        { number: '03', title: 'Ficha de deal', body: 'Entregables, documentos, facturas y actividad de agentes en una vista.' },
        { number: '04', title: 'Auditoría única', body: 'Personas y agentes en el mismo registro, con autor y hora.' },
      ],
    },
    queue: [
      { status: 'Pendiente', tone: 'pending', agent: 'Zack Deal Clerk', title: 'Emitir factura 2/3 por 8.400 €' },
      { status: 'Pendiente', tone: 'pending', agent: 'Zack Deal Clerk', title: 'Enviar contrato a Aurex Energy' },
      { status: 'Borrador', tone: 'draft', agent: 'Zack CRM', title: 'Recordatorio a Vantell tras 14 días' },
      { status: 'Error', tone: 'error', agent: 'Automatización', title: 'La sincronización de deals falló 3 veces' },
      { status: 'Recomendación', tone: 'info', agent: 'Zack Growth', title: '9 creadores para Northwind Labs' },
    ],
    pipeline: [
      { name: 'Conversación', total: '22.000 €', deals: [
        { reference: 'KP-1051', creator: 'Kito Vane', brand: 'Aurex Energy', status: 'Borrador', tone: 'draft', amount: '14.000 €', alert: 'Contrato listo', progress: '12%' },
        { reference: 'KP-1055', creator: 'Nima Sørl', brand: 'Palefox Studios', status: 'Borrador', tone: 'draft', amount: '8.000 €', alert: 'Creado por Zack', progress: '8%' },
      ] },
      { name: 'Propuesta', total: '46.500 €', deals: [
        { reference: 'KP-1047', creator: 'Vera Nolan', brand: 'Northwind Labs', status: 'Activo', tone: 'live', amount: '28.500 €', alert: 'Hoja · 9 d', progress: '34%' },
        { reference: 'KP-1049', creator: 'Sela Braun', brand: 'Corta Drinks', status: 'Activo', tone: 'live', amount: '18.000 €', alert: 'Entregables', progress: '40%' },
      ] },
      { name: 'Negociación', total: '35.000 €', deals: [
        { reference: 'KP-1033', creator: 'Orin Delph', brand: 'Vantell Mobility', status: 'Bloqueado', tone: 'error', amount: '35.000 €', alert: '14 d sin respuesta', progress: '52%' },
      ] },
      { name: 'En ejecución', total: '58.000 €', deals: [
        { reference: 'KP-1042', creator: 'Kito Vane', brand: 'Aurex Energy', status: 'Activo', tone: 'live', amount: '25.200 €', alert: 'Factura 2/3', progress: '68%' },
        { reference: 'KP-1044', creator: 'Vera Nolan', brand: 'Helio Foods', status: 'Activo', tone: 'live', amount: '32.800 €', alert: 'Al día', progress: '74%' },
      ] },
    ],
    deal: {
      stage: 'KP-1042 · En ejecución', creator: 'Kito Vane', brand: 'Aurex Energy · Lanzamiento Q3',
      figures: [{ label: 'Importe', value: '25.200 €' }, { label: 'Margen', value: '29%' }, { label: 'Responsable', value: 'M. Corvo' }],
      approval: 'Emitir factura 2/3 por 8.400 €', deliverablesLabel: 'Entregables · 3 de 4',
      deliverables: [
        { title: 'Vídeo integrado 60 s', date: '12 ago', status: 'Entregado', done: true },
        { title: 'Directo de lanzamiento', date: '28 ago', status: 'Entregado', done: true },
        { title: '3 clips verticales', date: '30 ago', status: 'Entregado', done: true },
        { title: 'Informe de resultados', date: '12 sep', status: 'En curso', done: false },
      ],
      activityLabel: 'Actividad de agentes',
      activity: [
        { status: 'Pendiente', tone: 'pending', when: 'hoy 09:14', text: 'Preparó la factura y la dejó sin emitir.' },
        { status: 'Información', tone: 'info', when: 'hoy 08:02', text: 'El deal cumple los hitos de facturación.' },
        { status: 'Ejecutada', tone: 'done', when: '30 ago', text: 'Actualizó la hoja. Aprobó M. Corvo.' },
      ],
    },
    socialProof: {
      label: 'Nacido de una operación real',
      body: 'Desarrollado desde el día a día de SocialPro: deals, talento, campañas, documentos y finanzas.',
      link: 'Conocer SocialPro',
    },
  },
  en: {
    promise: {
      lineOne: 'Automate the process.', lineTwo: 'Keep the decision.',
      body: 'Agents prepare, propose and document. Every action with financial, contractual or external impact waits for a person.',
      rules: [
        { label: 'Rule 01', title: 'Proposes, never decides', body: 'Agents prepare drafts and proposals with evidence. They never execute on their own.' },
        { label: 'Rule 02', title: 'Approval with context', body: 'Every proposal shows what changes, where it comes from and who may approve it.' },
        { label: 'Rule 03', title: 'Everything is logged', body: 'People and agents share one audit trail, with author and time.' },
      ],
    },
    showcase: {
      kicker: 'Inside the product', title: 'What the operation looks like inside',
      body: 'Three screens sum up the product: the decision queue, the pipeline and the deal record. Each shows the context that sets it apart from an ordinary CRM.',
      demoLabel: 'Demo data', notesLabel: 'What to look at',
      disclaimer: 'Demo screens with fictional data. The real interface is shown in the demo session.',
      screens: [
        { title: 'Decision queue', crumb: 'Command Center', notes: [
          { number: '1', title: 'One proposal, one card', body: 'Every Zack action has its own state and is never confused with completed work.' },
          { number: '2', title: 'The change, before approval', body: 'Evidence stays linked to its source so the full context can be reviewed.' },
          { number: '3', title: 'Who decides', body: 'The button only appears for those with permission. No approval, no issue.' },
        ] },
        { title: 'Pipeline', crumb: 'Deals · Pipeline', notes: [
          { number: '1', title: 'Creator first', body: 'Cards lead with talent, then brand: the way an agency works.' },
          { number: '2', title: 'One alert per deal', body: 'Blockers, stale sheets or waiting invoices, without extra noise.' },
          { number: '3', title: 'Unambiguous states', body: 'Agent-prepared work is distinct from approved work at a glance.' },
        ] },
        { title: 'Deal record', crumb: 'Deals · KP-1042', notes: [
          { number: '1', title: 'Header with the essentials', body: 'Amount, margin, owner and status are immediately accessible.' },
          { number: '2', title: 'Pending work, on top', body: 'The proposal awaiting a decision occupies the most visible band.' },
          { number: '3', title: 'Activity with evidence', body: 'Information, draft, pending, executed or error: always labelled.' },
        ] },
      ],
      summary: [
        { number: '01', title: 'Decision queue', body: 'Every proposal shows what changes, on what evidence and who may approve it.' },
        { number: '02', title: 'Pipeline', body: 'Creator first, brand second; amount, owner and one alert per deal.' },
        { number: '03', title: 'Deal record', body: 'Deliverables, documents, invoices and agent activity in one view.' },
        { number: '04', title: 'Single audit trail', body: 'People and agents in the same log, with author and time.' },
      ],
    },
    queue: [
      { status: 'Pending', tone: 'pending', agent: 'Zack Deal Clerk', title: 'Issue invoice 2/3 for €8,400' },
      { status: 'Pending', tone: 'pending', agent: 'Zack Deal Clerk', title: 'Send contract to Aurex Energy' },
      { status: 'Draft', tone: 'draft', agent: 'Zack CRM', title: 'Reminder to Vantell after 14 days' },
      { status: 'Error', tone: 'error', agent: 'Automation', title: 'Deal sync failed 3 times' },
      { status: 'Recommendation', tone: 'info', agent: 'Zack Growth', title: '9 creators for Northwind Labs' },
    ],
    pipeline: [
      { name: 'Conversation', total: '€22,000', deals: [
        { reference: 'KP-1051', creator: 'Kito Vane', brand: 'Aurex Energy', status: 'Draft', tone: 'draft', amount: '€14,000', alert: 'Contract ready', progress: '12%' },
        { reference: 'KP-1055', creator: 'Nima Sørl', brand: 'Palefox Studios', status: 'Draft', tone: 'draft', amount: '€8,000', alert: 'Created by Zack', progress: '8%' },
      ] },
      { name: 'Proposal', total: '€46,500', deals: [
        { reference: 'KP-1047', creator: 'Vera Nolan', brand: 'Northwind Labs', status: 'Active', tone: 'live', amount: '€28,500', alert: 'Sheet · 9 d', progress: '34%' },
        { reference: 'KP-1049', creator: 'Sela Braun', brand: 'Corta Drinks', status: 'Active', tone: 'live', amount: '€18,000', alert: 'Deliverables', progress: '40%' },
      ] },
      { name: 'Negotiation', total: '€35,000', deals: [
        { reference: 'KP-1033', creator: 'Orin Delph', brand: 'Vantell Mobility', status: 'Blocked', tone: 'error', amount: '€35,000', alert: '14 d no reply', progress: '52%' },
      ] },
      { name: 'In progress', total: '€58,000', deals: [
        { reference: 'KP-1042', creator: 'Kito Vane', brand: 'Aurex Energy', status: 'Active', tone: 'live', amount: '€25,200', alert: 'Invoice 2/3', progress: '68%' },
        { reference: 'KP-1044', creator: 'Vera Nolan', brand: 'Helio Foods', status: 'Active', tone: 'live', amount: '€32,800', alert: 'On track', progress: '74%' },
      ] },
    ],
    deal: {
      stage: 'KP-1042 · In progress', creator: 'Kito Vane', brand: 'Aurex Energy · Q3 launch',
      figures: [{ label: 'Amount', value: '€25,200' }, { label: 'Margin', value: '29%' }, { label: 'Owner', value: 'M. Corvo' }],
      approval: 'Issue invoice 2/3 for €8,400', deliverablesLabel: 'Deliverables · 3 of 4',
      deliverables: [
        { title: 'Integrated video 60 s', date: '12 Aug', status: 'Delivered', done: true },
        { title: 'Launch live stream', date: '28 Aug', status: 'Delivered', done: true },
        { title: '3 vertical clips', date: '30 Aug', status: 'Delivered', done: true },
        { title: 'Results report', date: '12 Sep', status: 'In progress', done: false },
      ],
      activityLabel: 'Agent activity',
      activity: [
        { status: 'Pending', tone: 'pending', when: 'today 09:14', text: 'Prepared the invoice and left it unissued.' },
        { status: 'Information', tone: 'info', when: 'today 08:02', text: 'The deal meets its invoicing milestones.' },
        { status: 'Executed', tone: 'done', when: '30 Aug', text: 'Updated the sheet. Approved by M. Corvo.' },
      ],
    },
    socialProof: {
      label: 'Built from a real operation',
      body: 'Developed from SocialPro’s day-to-day work across deals, talent, campaigns, documents and finance.',
      link: 'Meet SocialPro',
    },
  },
};

export function getProductCopy(locale: KekoPilotLocale): ProductCopy {
  return PRODUCT_COPY[locale];
}

export function getProductConsoleCopy(locale: KekoPilotLocale): ProductConsoleCopy {
  const { showcase, queue, pipeline, deal } = PRODUCT_COPY[locale];
  return { showcase, queue, pipeline, deal };
}
