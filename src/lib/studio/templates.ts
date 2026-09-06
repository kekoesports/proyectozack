export const STUDIO_TEMPLATES = [
  {
    id: 'presentation',
    number: '01',
    name: 'Tu presentación',
    label: 'IDENTIDAD',
    description: 'Quién eres, qué haces y por qué seguirte.',
    hook: 'Lo que no sabes de mí',
    structure: [
      'Un motivo para quedarte',
      'Mi historia en tres ideas',
      'Lo que viene ahora',
    ],
    cta: 'Sígueme para ver lo que viene.',
  },
  {
    id: 'educational',
    number: '02',
    name: 'Un tip que aporta',
    label: 'EDUCATIVO',
    description: 'Una idea útil, una demostración y algo que probar.',
    hook: 'El error que puedes evitar hoy',
    structure: [
      'El problema en una frase',
      'Cómo lo resuelvo con un ejemplo',
      'Una acción que poner en práctica',
    ],
    cta: 'Guárdalo y cuéntame si te sirve.',
  },
  {
    id: 'campaign',
    number: '03',
    name: 'Una colaboración real',
    label: 'CAMPAÑA',
    description: 'Tu experiencia, material propio y un mensaje claro.',
    hook: 'Así lo he probado',
    structure: [
      'Sitúa la colaboración y su objetivo',
      'Explica la propuesta con un ejemplo',
      'Cierra con el siguiente paso',
    ],
    cta: 'Tienes los detalles en la descripción.',
  },
] as const;

export function studioTemplate(id: string) {
  return STUDIO_TEMPLATES.find((item) => item.id === id) ?? STUDIO_TEMPLATES[0];
}
export function studioStatus(value: string) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    in_review: 'En revisión',
    changes_requested: 'Cambios solicitados',
    approved: 'Guion aprobado',
  };
  return labels[value] ?? 'Pendiente';
}
