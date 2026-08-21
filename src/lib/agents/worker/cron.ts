/**
 * Expresiones cron de cinco campos, con zona horaria.
 *
 * Escrito a mano en vez de añadir una dependencia porque el subconjunto que
 * hace falta es pequeño y porque el trozo difícil —el horario de verano— no lo
 * resuelve la librería sino la decisión de qué hacer con las horas que no
 * existen o que existen dos veces. Eso conviene tenerlo a la vista.
 *
 * Soporta: `*`, números, listas `1,15`, rangos `1-5` y pasos `*` /`n` o `a-b/n`.
 * No soporta: `L`, `W`, `#`, nombres de mes o día, ni segundos. Una expresión
 * con cualquiera de esos se rechaza al validarla, no al ejecutarse.
 *
 * ```text
 * ┌───────── minuto (0-59)
 * │ ┌─────── hora (0-23)
 * │ │ ┌───── día del mes (1-31)
 * │ │ │ ┌─── mes (1-12)
 * │ │ │ │ ┌─ día de la semana (0-6, domingo = 0)
 * * * * * *
 * ```
 */

export type CronField = readonly number[];

export type ParsedCron = {
  readonly minutes: CronField;
  readonly hours: CronField;
  readonly daysOfMonth: CronField;
  readonly months: CronField;
  readonly daysOfWeek: CronField;
  /** `true` si tanto el día del mes como el de la semana están restringidos. */
  readonly bothDayFieldsRestricted: boolean;
};

export class CronError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronError';
  }
}

function parseField(campo: string, min: number, max: number, nombre: string): CronField {
  const valores = new Set<number>();

  for (const parte of campo.split(',')) {
    const [rango, pasoTexto] = parte.split('/');
    if (rango === undefined || rango === '') throw new CronError(`Campo ${nombre} vacío en '${campo}'`);

    const paso = pasoTexto === undefined ? 1 : Number(pasoTexto);
    if (!Number.isInteger(paso) || paso < 1) throw new CronError(`Paso inválido en ${nombre}: '${parte}'`);

    let desde: number;
    let hasta: number;

    if (rango === '*') {
      desde = min;
      hasta = max;
    } else if (rango.includes('-')) {
      const [a, b] = rango.split('-');
      desde = Number(a);
      hasta = Number(b);
    } else {
      desde = Number(rango);
      hasta = pasoTexto === undefined ? desde : max;
    }

    if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
      throw new CronError(`Valor no numérico en ${nombre}: '${parte}'`);
    }
    if (desde < min || hasta > max || desde > hasta) {
      throw new CronError(`Fuera de rango en ${nombre} (${min}-${max}): '${parte}'`);
    }

    for (let v = desde; v <= hasta; v += paso) valores.add(v);
  }

  if (valores.size === 0) throw new CronError(`Campo ${nombre} no produce ningún valor`);
  return [...valores].sort((a, b) => a - b);
}

export function parseCron(expresion: string): ParsedCron {
  const campos = expresion.trim().split(/\s+/);
  if (campos.length !== 5) {
    throw new CronError(`Se esperaban 5 campos y llegaron ${campos.length}: '${expresion}'`);
  }
  if (/[LW#?]/i.test(expresion)) {
    throw new CronError(`Sintaxis no soportada (L, W, #, ?) en '${expresion}'`);
  }

  const [min, hor, dom, mes, dow] = campos;
  if (min === undefined || hor === undefined || dom === undefined || mes === undefined || dow === undefined) {
    throw new CronError(`Expresión incompleta: '${expresion}'`);
  }

  return {
    minutes: parseField(min, 0, 59, 'minuto'),
    hours: parseField(hor, 0, 23, 'hora'),
    daysOfMonth: parseField(dom, 1, 31, 'día del mes'),
    months: parseField(mes, 1, 12, 'mes'),
    daysOfWeek: parseField(dow, 0, 6, 'día de la semana'),
    // Con ambos campos restringidos, cron clásico usa OR, no AND. Es una rareza
    // heredada de Vixie cron, pero cambiarla sorprendería a quien escriba la
    // expresión esperando el comportamiento de siempre.
    bothDayFieldsRestricted: dom !== '*' && dow !== '*',
  };
}

/** Valida sin construir nada. Lo usa la capa de servicio antes de guardar. */
export function isValidCron(expresion: string): boolean {
  try {
    parseCron(expresion);
    return true;
  } catch {
    return false;
  }
}

type PartesLocales = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly weekday: number;
};

/**
 * Descompone un instante en la hora local de una zona.
 *
 * `Intl` es lo único del runtime que conoce las reglas de DST, así que se usa
 * como fuente de verdad en vez de sumar offsets a mano.
 */
export function partsInTimeZone(instante: Date, timeZone: string): PartesLocales {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const partes: Record<string, string> = {};
  for (const p of fmt.formatToParts(instante)) partes[p.type] = p.value;

  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hora = Number(partes.hour);

  return {
    year: Number(partes.year),
    month: Number(partes.month),
    day: Number(partes.day),
    // Algunas zonas formatean medianoche como 24; normalizar evita un desfase
    // de un día que solo aparecería a las 00:00.
    hour: hora === 24 ? 0 : hora,
    minute: Number(partes.minute),
    weekday: dias[partes.weekday ?? 'Sun'] ?? 0,
  };
}

/**
 * Instante UTC que corresponde a una hora local concreta.
 *
 * Se resuelve por aproximación en dos pasos: se estima el offset, se corrige, y
 * se vuelve a comprobar. Es lo que hace falta porque el offset depende del
 * propio instante que se está calculando.
 *
 * Cuando la hora local **no existe** —la madrugada en que el reloj salta
 * adelante— devuelve `null`. Es información, no un fallo: significa que esa
 * ventana no ocurre ese día, y el scheduler debe pasar a la siguiente en vez de
 * inventarse una hora.
 */
export function zonedTimeToUtc(
  partes: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string,
): Date | null {
  const comoUtc = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, 0, 0);

  let candidato = new Date(comoUtc);
  for (let i = 0; i < 3; i++) {
    const local = partsInTimeZone(candidato, timeZone);
    const localComoUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0, 0);
    const desvio = comoUtc - localComoUtc;
    if (desvio === 0) return candidato;
    candidato = new Date(candidato.getTime() + desvio);
  }

  // Tres vueltas sin converger = la hora local no existe ese día.
  const comprobacion = partsInTimeZone(candidato, timeZone);
  if (comprobacion.hour !== partes.hour || comprobacion.minute !== partes.minute) return null;
  return candidato;
}

function diaCoincide(parsed: ParsedCron, dia: number, diaSemana: number): boolean {
  const porMes = parsed.daysOfMonth.includes(dia);
  const porSemana = parsed.daysOfWeek.includes(diaSemana);
  // Cron clásico: con ambos campos restringidos, basta con que uno coincida.
  return parsed.bothDayFieldsRestricted ? porMes || porSemana : porMes && porSemana;
}

/** Días que se miran hacia delante antes de rendirse. */
const MAX_DIAS = 366 * 2;

/**
 * Siguiente ejecución estrictamente posterior a `desde`.
 *
 * Recorre día a día y, dentro de cada día válido, solo los minutos que el cron
 * declara. Un `0 8 * * *` mira 366 candidatos como mucho, no 527.000.
 *
 * Devuelve `null` si en dos años no hay ninguna coincidencia, que en la
 * práctica significa una expresión imposible como `0 0 30 2 *`.
 */
export function nextCronOccurrence(
  expresion: string,
  desde: Date,
  timeZone = 'Europe/Madrid',
): Date | null {
  const parsed = parseCron(expresion);
  const inicio = partsInTimeZone(desde, timeZone);

  let cursor = { year: inicio.year, month: inicio.month, day: inicio.day };

  for (let d = 0; d < MAX_DIAS; d++) {
    // El día de la semana se pregunta a `Intl` sobre el mediodía local: a esa
    // hora ningún cambio de horario puede desplazar la fecha.
    const medioDia = zonedTimeToUtc({ ...cursor, hour: 12, minute: 0 }, timeZone);
    if (medioDia) {
      const local = partsInTimeZone(medioDia, timeZone);
      if (parsed.months.includes(local.month) && diaCoincide(parsed, local.day, local.weekday)) {
        for (const hora of parsed.hours) {
          for (const minuto of parsed.minutes) {
            const candidato = zonedTimeToUtc({ ...cursor, hour: hora, minute: minuto }, timeZone);
            // `null` = esa hora local no existe hoy (salto de primavera).
            if (candidato && candidato.getTime() > desde.getTime()) return candidato;
          }
        }
      }
    }

    cursor = siguienteDia(cursor);
  }

  return null;
}

function siguienteDia(fecha: { year: number; month: number; day: number }): {
  year: number;
  month: number;
  day: number;
} {
  const d = new Date(Date.UTC(fecha.year, fecha.month - 1, fecha.day));
  d.setUTCDate(d.getUTCDate() + 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Ventanas perdidas entre dos instantes, acotadas.
 *
 * El tope no es una optimización: sin él, un worker que vuelve tras una semana
 * caído materializaría cientos de ejecuciones de golpe y se comería el
 * presupuesto del mes en minutos.
 */
export function missedOccurrences(
  expresion: string,
  desde: Date,
  hasta: Date,
  limite: number,
  timeZone = 'Europe/Madrid',
): readonly Date[] {
  const ventanas: Date[] = [];
  let cursor = desde;

  while (ventanas.length < limite) {
    const siguiente = nextCronOccurrence(expresion, cursor, timeZone);
    if (!siguiente || siguiente.getTime() > hasta.getTime()) break;
    ventanas.push(siguiente);
    cursor = siguiente;
  }

  return ventanas;
}
