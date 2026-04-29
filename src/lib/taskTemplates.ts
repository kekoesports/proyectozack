export type WeeklyTemplate = {
  readonly title:    string;
  readonly category: string;
  readonly priority: 'alta' | 'media' | 'baja';
};

export const WEEKLY_TEMPLATES: readonly WeeklyTemplate[] = [
  { title: 'Revisar conversaciones de Telegram',                        category: 'Operativo', priority: 'alta'  },
  { title: 'Revisar documentos con los tratos',                         category: 'Revenue',   priority: 'alta'  },
  { title: 'Revisar si al CM le debo algo',                             category: 'CM',        priority: 'media' },
  { title: 'Revisar tratos pendientes y documentos',                    category: 'Revenue',   priority: 'alta'  },
  { title: 'Revisar DMs de Twitter/X e Instagram',                      category: 'Operativo', priority: 'media' },
  { title: 'Revisar si le debo algo a Gestoría',                       category: 'Gestoría', priority: 'baja'  },
  { title: 'Revisar correos y enviar emails pendientes',                category: 'Operativo', priority: 'media' },
  { title: 'Revisar SullyGnome — nuevos perfiles casino y CS2',        category: 'Scouting',  priority: 'media' },
  { title: 'Revisar YouTube — nuevos creadores potenciales',            category: 'Scouting',  priority: 'media' },
  { title: 'Revisar Kick — quién está en directo',                     category: 'Scouting',  priority: 'media' },
  { title: 'Revisar Twitch — nuevos perfiles y quién está en directo', category: 'Scouting',  priority: 'media' },
  { title: 'Revisar nuevos creadores potenciales (casino, CS2, esports)', category: 'Growth',  priority: 'media' },
];

/** Set con todos los títulos exactos de plantillas — para badge "Plantilla" en UI */
export const TEMPLATE_TITLES: ReadonlySet<string> = new Set(WEEKLY_TEMPLATES.map((t) => t.title));
