import type { NavigationGroup, Tone } from './data';
import { NAVIGATION } from './data';

export const STATE_VOCABULARY = [
  { label: 'Borrador', tone: 'draft', body: 'Un agente lo ha preparado. No sale del workspace ni implica que algo haya sucedido.' },
  { label: 'Pendiente aprobación', tone: 'attention', body: 'Preparado y esperando a una persona con permiso. Es el único estado relleno en ámbar.' },
  { label: 'Ejecutada', tone: 'neutral', body: 'Sucedió de verdad y consta quién lo aprobó y cuándo.' },
  { label: 'Error', tone: 'danger', body: 'Falló o faltan datos. Siempre incluye causa y siguiente paso.' },
  { label: 'Información', tone: 'neutral', body: 'El agente resume o explica algo; no pide ninguna decisión.' },
  { label: 'Activo', tone: 'success', body: 'Estado normal de un objeto en curso, sin reclamar atención.' },
] as const satisfies ReadonlyArray<{ readonly label: string; readonly tone: Tone; readonly body: string }>;

export const PERMISSION_COLUMNS = ['Deals', 'Finanzas', 'Creadores', 'Automatiz.', 'Agentes', 'Equipo', 'Auditoría'] as const;

export const ROLES = [
  { name: 'Admin', marks: ['●', '●', '●', '●', '●', '●', '●'] },
  { name: 'Manager', marks: ['●', '●', '●', '●', '●', '●', '◐'] },
  { name: 'Staff', marks: ['◐', '—', '●', '◐', '—', '—', '—'] },
  { name: 'Ops', marks: ['●', '—', '●', '●', '●', '—', '—'] },
  { name: 'Talent manager', marks: ['●', '—', '●', '○', '○', '—', '—'] },
  { name: 'Finance', marks: ['○', '●', '—', '○', '○', '—', '○'] },
] as const;

export const FLOWS = [
  { title: 'De conversación a deal', steps: ['El agente detecta importe y contraparte.', 'Crea un borrador con evidencia enlazada.', 'La persona revisa y aprueba.', 'El deal entra en Propuesta.'] },
  { title: 'De entregable a factura', steps: ['Se confirma el entregable.', 'El agente comprueba la cláusula del contrato.', 'Prepara la factura sin emitir.', 'Finance revisa y aprueba.'] },
  { title: 'De error a reintento', steps: ['La automatización marca el error.', 'El Command Center muestra causa y alcance.', 'Una persona corrige la conexión.', 'El sistema reintenta y registra el resultado.'] },
] as const;

export const PHASES = [
  { tag: 'Actual', title: 'Vista operacional', body: 'Command Center, pipeline y ficha leen campañas, tareas, facturas y agentes del workspace.' },
  { tag: 'Actual', title: 'Automatización supervisada', body: 'n8n orquesta fuentes externas; el CRM valida y conserva cada escritura.' },
  { tag: 'Actual', title: 'Identidad white-label', body: 'Nombre, color, asistente, referencias y acceso principal se configuran por despliegue.' },
  { tag: 'Completa', title: 'Inteligencia y finanzas', body: 'Estadísticas multicanal, KPI, facturación y conciliación dentro de los permisos vigentes.' },
] as const;

export const ARCHITECTURE_GROUPS: ReadonlyArray<NavigationGroup> = NAVIGATION;
