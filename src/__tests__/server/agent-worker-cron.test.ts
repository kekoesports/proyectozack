/**
 * Parser de cron con zona horaria.
 *
 * Lo interesante no es `* * * * *` sino el horario de verano: las madrugadas en
 * que una hora local no existe, o existe dos veces. Una rutina diaria a las
 * 02:30 en Madrid se topa con las dos cosas una vez al año, y el resultado no
 * puede ser ni saltarse el día ni ejecutarse dos veces.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  CronError,
  isValidCron,
  missedOccurrences,
  nextCronOccurrence,
  parseCron,
  partsInTimeZone,
  zonedTimeToUtc,
} from '@/lib/agents/worker/cron';

describe('parseCron', () => {
  it('acepta las expresiones del blueprint', () => {
    expect(parseCron('30 8 * * *').hours).toEqual([8]);
    expect(parseCron('0 9 * * 1').daysOfWeek).toEqual([1]);
    expect(parseCron('*/15 * * * *').minutes).toEqual([0, 15, 30, 45]);
  });

  it('entiende listas, rangos y pasos', () => {
    expect(parseCron('0,30 * * * *').minutes).toEqual([0, 30]);
    expect(parseCron('0 9-17 * * *').hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(parseCron('0 0-12/6 * * *').hours).toEqual([0, 6, 12]);
  });

  it('rechaza lo que no soporta en vez de interpretarlo mal', () => {
    // Aceptar `L` y tratarlo como otra cosa sería peor que rechazarlo.
    expect(() => parseCron('0 0 L * *')).toThrow(CronError);
    expect(() => parseCron('0 0 * * 1#2')).toThrow(CronError);
    expect(() => parseCron('0 0 * *')).toThrow(CronError);
    expect(() => parseCron('0 0 * * * *')).toThrow(CronError);
  });

  it('rechaza valores fuera de rango', () => {
    expect(() => parseCron('60 * * * *')).toThrow(CronError);
    expect(() => parseCron('* 24 * * *')).toThrow(CronError);
    expect(() => parseCron('* * 0 * *')).toThrow(CronError);
    expect(() => parseCron('* * * 13 *')).toThrow(CronError);
    expect(() => parseCron('* * * * 7')).toThrow(CronError);
  });

  it('isValidCron no lanza', () => {
    expect(isValidCron('30 8 * * *')).toBe(true);
    expect(isValidCron('esto no es cron')).toBe(false);
  });
});

describe('partsInTimeZone', () => {
  it('descompone en hora local de Madrid', () => {
    // Verano: UTC+2.
    const partes = partsInTimeZone(new Date('2026-07-15T10:00:00Z'), 'Europe/Madrid');
    expect(partes.hour).toBe(12);
    expect(partes.day).toBe(15);
  });

  it('respeta el cambio a horario de invierno', () => {
    // Invierno: UTC+1.
    const partes = partsInTimeZone(new Date('2026-01-15T10:00:00Z'), 'Europe/Madrid');
    expect(partes.hour).toBe(11);
  });

  it('normaliza la medianoche a 0, no a 24', () => {
    const partes = partsInTimeZone(new Date('2026-01-14T23:00:00Z'), 'Europe/Madrid');
    expect(partes.hour).toBe(0);
    expect(partes.day).toBe(15);
  });
});

describe('zonedTimeToUtc', () => {
  it('convierte hora local a instante UTC', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 7, day: 15, hour: 12, minute: 0 }, 'Europe/Madrid');
    expect(utc?.toISOString()).toBe('2026-07-15T10:00:00.000Z');
  });

  it('devuelve null cuando la hora local no existe', () => {
    // 2026-03-29: en Madrid el reloj salta de las 02:00 a las 03:00.
    const utc = zonedTimeToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, 'Europe/Madrid');
    expect(utc).toBeNull();
  });

  it('resuelve la hora que existe dos veces sin duplicar', () => {
    // 2026-10-25: las 02:30 ocurren dos veces. Se elige una, y siempre la misma.
    const a = zonedTimeToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, 'Europe/Madrid');
    const b = zonedTimeToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, 'Europe/Madrid');
    expect(a).not.toBeNull();
    expect(a?.getTime()).toBe(b?.getTime());
  });
});

describe('nextCronOccurrence', () => {
  it('calcula la siguiente ejecución diaria', () => {
    const siguiente = nextCronOccurrence('30 8 * * *', new Date('2026-07-15T10:00:00Z'), 'Europe/Madrid');
    // 08:30 de Madrid en verano = 06:30 UTC, y hoy ya pasó.
    expect(siguiente?.toISOString()).toBe('2026-07-16T06:30:00.000Z');
  });

  it('es estrictamente posterior: no devuelve el instante dado', () => {
    const ahora = new Date('2026-07-15T06:30:00.000Z');
    const siguiente = nextCronOccurrence('30 8 * * *', ahora, 'Europe/Madrid');
    expect(siguiente?.getTime()).toBeGreaterThan(ahora.getTime());
  });

  it('respeta el día de la semana', () => {
    const siguiente = nextCronOccurrence('0 9 * * 1', new Date('2026-07-15T00:00:00Z'), 'Europe/Madrid');
    expect(siguiente).not.toBeNull();
    if (siguiente) {
      expect(partsInTimeZone(siguiente, 'Europe/Madrid').weekday).toBe(1);
    }
  });

  it('salta el día cuando la hora local no existe, en vez de inventarla', () => {
    // Rutina a las 02:30; el 29 de marzo esa hora no existe en Madrid.
    const siguiente = nextCronOccurrence('30 2 * * *', new Date('2026-03-28T12:00:00Z'), 'Europe/Madrid');
    expect(siguiente).not.toBeNull();
    if (siguiente) {
      const partes = partsInTimeZone(siguiente, 'Europe/Madrid');
      expect(partes.hour).toBe(2);
      expect(partes.minute).toBe(30);
      // El 29 no puede ser: esa hora no existe ese día.
      expect(partes.day).not.toBe(29);
    }
  });

  it('mantiene la hora LOCAL al cruzar el cambio de horario', () => {
    // Lo que el humano espera de "todos los días a las 08:30" es 08:30 de
    // Madrid, no un instante UTC fijo que se desplace en marzo.
    const invierno = nextCronOccurrence('30 8 * * *', new Date('2026-03-25T12:00:00Z'), 'Europe/Madrid');
    const verano = nextCronOccurrence('30 8 * * *', new Date('2026-04-05T12:00:00Z'), 'Europe/Madrid');
    expect(partsInTimeZone(invierno!, 'Europe/Madrid').hour).toBe(8);
    expect(partsInTimeZone(verano!, 'Europe/Madrid').hour).toBe(8);
    // Y en UTC son horas distintas, que es justo la prueba de que sigue el DST.
    expect(invierno?.getUTCHours()).not.toBe(verano?.getUTCHours());
  });

  it('devuelve null para una expresión imposible', () => {
    expect(nextCronOccurrence('0 0 30 2 *', new Date('2026-01-01T00:00:00Z'))).toBeNull();
  });
});

describe('missedOccurrences', () => {
  it('lista las ventanas perdidas', () => {
    const perdidas = missedOccurrences(
      '30 8 * * *',
      new Date('2026-07-10T00:00:00Z'),
      new Date('2026-07-15T00:00:00Z'),
      10,
      'Europe/Madrid',
    );
    expect(perdidas).toHaveLength(5);
  });

  it('respeta el límite: un worker caído una semana no despierta con cien ejecuciones', () => {
    const perdidas = missedOccurrences(
      '*/5 * * * *',
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-07-15T00:00:00Z'),
      3,
      'Europe/Madrid',
    );
    expect(perdidas).toHaveLength(3);
  });

  it('devuelve vacío si no hay nada perdido', () => {
    expect(
      missedOccurrences('30 8 * * *', new Date('2026-07-15T07:00:00Z'), new Date('2026-07-15T08:00:00Z'), 5),
    ).toEqual([]);
  });
});
