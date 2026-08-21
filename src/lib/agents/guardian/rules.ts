import type { AgentEvent } from '@/types';

/**
 * Reglas deterministas de Guardian.
 *
 * **La IA no decide si el disco está al 90 %.** Recibe ese hecho ya calculado.
 * Esta separación es la que hace que Guardian sea fiable: la detección es
 * código con umbrales explícitos y probados, y el modelo solo correlaciona,
 * explica y prioriza lo que las reglas ya encontraron.
 *
 * Lo contrario —pedirle al modelo que mire las métricas y diga si hay
 * problema— produce un vigilante que a veces no ve un servicio caído y a veces
 * inventa una incidencia que no existe. Ninguna de las dos cosas es aceptable
 * en algo que te avisa de noche.
 *
 * Ver docs/agent-os/agents-tools-policies.md §5.
 */

export type Severidad = 'info' | 'warning' | 'high' | 'critical';

export type Finding = {
  /** Código estable. Viaja al informe y a las métricas. */
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: Severidad;
  /** IDs de los eventos que lo sostienen. Sin evidencia no hay hallazgo. */
  readonly evidenceEventIds: readonly number[];
  readonly confidence: 'low' | 'medium' | 'high';
};

/** Umbrales. Configurables sin tocar código y sin contener secretos. */
export type GuardianThresholds = {
  readonly diskWarningPct: number;
  readonly diskCriticalPct: number;
  readonly inodesWarningPct: number;
  readonly inodesCriticalPct: number;
  readonly memoryWarningPct: number;
  readonly memoryCriticalPct: number;
  readonly swapPressurePct: number;
  readonly backupMaxHours: number;
  readonly workerHeartbeatMaxSeconds: number;
  readonly appFailuresForCritical: number;
  readonly tlsWarningDays: number;
  /** Repeticiones del mismo síntoma antes de considerarlo recurrente. */
  readonly recurrenceCount: number;
};

export const DEFAULT_THRESHOLDS: GuardianThresholds = {
  diskWarningPct: 80,
  diskCriticalPct: 90,
  inodesWarningPct: 80,
  inodesCriticalPct: 90,
  memoryWarningPct: 85,
  memoryCriticalPct: 90,
  // El swap solo alarma acompañado de presión de memoria: una máquina con swap
  // usado y RAM libre lleva así desde el último pico.
  swapPressurePct: 50,
  backupMaxHours: 26,
  workerHeartbeatMaxSeconds: 90,
  // Tres fallos seguidos, no uno: un 500 aislado no es una caída.
  appFailuresForCritical: 3,
  tlsWarningDays: 21,
  recurrenceCount: 3,
};

function num(payload: Record<string, unknown>, clave: string): number | null {
  const valor = payload[clave];
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function str(payload: Record<string, unknown>, clave: string): string | null {
  const valor = payload[clave];
  return typeof valor === 'string' ? valor : null;
}

/**
 * Evalúa un lote de señales y devuelve los hallazgos.
 *
 * Puro: entran eventos y umbrales, salen hallazgos. Sin base de datos y sin
 * modelo, así que cada umbral se puede probar con un caso concreto.
 */
export function evaluateGuardianRules(
  eventos: readonly AgentEvent[],
  umbrales: GuardianThresholds = DEFAULT_THRESHOLDS,
): readonly Finding[] {
  const hallazgos: Finding[] = [];

  for (const evento of eventos) {
    const p = evento.payloadJson;

    switch (evento.eventType) {
      case 'system.disk': {
        const pct = num(p, 'usedPct');
        if (pct === null) break;
        if (pct >= umbrales.diskCriticalPct) {
          hallazgos.push({
            code: 'disk_critical',
            title: `Disco al ${pct} %`,
            summary: `El sistema de ficheros ha superado el ${umbrales.diskCriticalPct} % de ocupación. Por encima de ese punto, PostgreSQL puede dejar de escribir.`,
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        } else if (pct >= umbrales.diskWarningPct) {
          hallazgos.push({
            code: 'disk_warning',
            title: `Disco al ${pct} %`,
            summary: `Ocupación por encima del ${umbrales.diskWarningPct} %. Conviene mirarlo antes de que sea urgente.`,
            severity: 'warning',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'system.inodes': {
        const pct = num(p, 'usedPct');
        if (pct === null) break;
        if (pct >= umbrales.inodesCriticalPct) {
          hallazgos.push({
            code: 'inodes_critical',
            title: `Inodos al ${pct} %`,
            // El síntoma engaña: hay espacio libre y aun así no se puede
            // escribir. Merece decirlo en el propio hallazgo.
            summary: `Quedan pocos inodos. El disco puede tener espacio de sobra y aun así fallar toda escritura.`,
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        } else if (pct >= umbrales.inodesWarningPct) {
          hallazgos.push({
            code: 'inodes_warning',
            title: `Inodos al ${pct} %`,
            summary: 'Consumo alto de inodos, normalmente por muchos ficheros pequeños.',
            severity: 'warning',
            evidenceEventIds: [evento.id],
            confidence: 'medium',
          });
        }
        break;
      }

      case 'system.memory': {
        const mem = num(p, 'usedPct');
        const swap = num(p, 'swapPct');
        if (mem === null) break;
        if (mem >= umbrales.memoryCriticalPct && (swap ?? 0) >= umbrales.swapPressurePct) {
          hallazgos.push({
            code: 'memory_critical',
            title: `Memoria al ${mem} % con swap al ${swap ?? 0} %`,
            summary:
              'RAM agotada y swap en uso sostenido. El siguiente paso suele ser que el kernel mate un proceso.',
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        } else if (mem >= umbrales.memoryWarningPct) {
          hallazgos.push({
            code: 'memory_warning',
            title: `Memoria al ${mem} %`,
            summary: 'Uso alto de RAM sin presión de swap todavía.',
            severity: 'warning',
            evidenceEventIds: [evento.id],
            confidence: 'medium',
          });
        }
        break;
      }

      case 'system.service': {
        const estado = str(p, 'state');
        const unidad = str(p, 'unit') ?? 'desconocido';
        if (estado && estado !== 'active') {
          hallazgos.push({
            code: 'service_down',
            title: `Servicio ${unidad} caído`,
            summary: `La unidad está en estado '${estado}'.`,
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'backup.heartbeat': {
        const horas = num(p, 'ageHours');
        if (horas !== null && horas >= umbrales.backupMaxHours) {
          hallazgos.push({
            code: 'backup_stale',
            title: `Último backup hace ${horas} h`,
            summary: `Supera el objetivo de ${umbrales.backupMaxHours} h. Un backup que no se hace no se nota hasta que hace falta.`,
            severity: 'high',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'backup.failed': {
        hallazgos.push({
          code: 'backup_failed',
          title: 'El backup falló',
          summary: str(p, 'reason') ?? 'Sin motivo declarado.',
          severity: 'high',
          evidenceEventIds: [evento.id],
          confidence: 'high',
        });
        break;
      }

      case 'db.health': {
        if (str(p, 'status') === 'down') {
          hallazgos.push({
            code: 'database_down',
            title: 'La base de datos no responde',
            summary: 'El check de disponibilidad falla. Sin base no hay CRM, ni web dinámica, ni agentes.',
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'app.health': {
        const fallos = num(p, 'consecutiveFailures') ?? 0;
        if (fallos >= umbrales.appFailuresForCritical) {
          hallazgos.push({
            code: 'app_down',
            title: `Aplicación con ${fallos} fallos seguidos`,
            summary: 'Supera el umbral de fallos consecutivos: no es un pico aislado.',
            severity: 'critical',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'tls.expiring': {
        const dias = num(p, 'daysLeft');
        if (dias !== null && dias <= umbrales.tlsWarningDays) {
          hallazgos.push({
            code: 'tls_expiring',
            title: `El certificado caduca en ${dias} días`,
            summary: 'La renovación automática debería haber ocurrido ya. Conviene comprobarla.',
            severity: dias <= 7 ? 'high' : 'warning',
            evidenceEventIds: [evento.id],
            confidence: 'high',
          });
        }
        break;
      }

      case 'n8n.workflow_failed':
      case 'github.workflow_failed': {
        hallazgos.push({
          code: evento.eventType === 'n8n.workflow_failed' ? 'n8n_workflow_failed' : 'ci_workflow_failed',
          title: `Workflow fallido: ${str(p, 'workflow') ?? 'sin nombre'}`,
          summary: 'Una ejecución automática terminó en error.',
          severity: 'warning',
          evidenceEventIds: [evento.id],
          confidence: 'medium',
        });
        break;
      }

      case 'uptime.down': {
        hallazgos.push({
          code: 'monitor_down',
          title: `Monitor caído: ${str(p, 'monitor') ?? 'sin nombre'}`,
          summary: 'Un monitor externo reporta el servicio como no disponible.',
          severity: 'critical',
          evidenceEventIds: [evento.id],
          confidence: 'high',
        });
        break;
      }

      default:
        // Un tipo sin regla no produce hallazgo. Es lo correcto: inventar uno
        // genérico llenaría el informe de ruido que nadie sabría interpretar.
        break;
    }
  }

  return agruparRecurrentes(hallazgos, umbrales.recurrenceCount);
}

/**
 * Agrupa los hallazgos repetidos en uno solo.
 *
 * El collector corre cada cinco minutos: un disco lleno produce doce hallazgos
 * por hora. Sin agrupar, un informe diario tendría cientos de líneas iguales y
 * el problema real se perdería entre ellas. La evidencia se conserva entera —el
 * hallazgo agrupado cita todos los eventos que lo sostienen—.
 */
function agruparRecurrentes(hallazgos: readonly Finding[], minimoRecurrencia: number): readonly Finding[] {
  const porCodigo = new Map<string, Finding[]>();
  for (const h of hallazgos) {
    const lista = porCodigo.get(h.code) ?? [];
    lista.push(h);
    porCodigo.set(h.code, lista);
  }

  const salida: Finding[] = [];
  for (const [codigo, grupo] of porCodigo) {
    const primero = grupo[0];
    if (!primero) continue;

    if (grupo.length === 1) {
      salida.push(primero);
      continue;
    }

    const ids = grupo.flatMap((h) => h.evidenceEventIds);
    const recurrente = grupo.length >= minimoRecurrencia;

    salida.push({
      ...primero,
      code: codigo,
      title: `${primero.title} (${grupo.length} lecturas)`,
      summary: recurrente
        ? `${primero.summary} Se repite de forma sostenida: ${grupo.length} lecturas en el periodo.`
        : primero.summary,
      // Lo sostenido pesa más que lo puntual, pero nunca baja de severidad.
      severity: recurrente ? subirSeveridad(primero.severity) : primero.severity,
      evidenceEventIds: ids,
      confidence: recurrente ? 'high' : primero.confidence,
    });
  }

  return salida.sort((a, b) => ORDEN[b.severity] - ORDEN[a.severity]);
}

const ORDEN: Record<Severidad, number> = { info: 0, warning: 1, high: 2, critical: 3 };

function subirSeveridad(s: Severidad): Severidad {
  if (s === 'info') return 'warning';
  if (s === 'warning') return 'high';
  return s === 'high' ? 'critical' : s;
}

/** Severidad global de un informe: la del hallazgo más grave. */
export function overallSeverity(hallazgos: readonly Finding[]): Severidad {
  return hallazgos.reduce<Severidad>(
    (peor, h) => (ORDEN[h.severity] > ORDEN[peor] ? h.severity : peor),
    'info',
  );
}
