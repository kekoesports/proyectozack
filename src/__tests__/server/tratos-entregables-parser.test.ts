/**
 * Tests unitarios del parser `parseDeliverablesJson` y del schema Zod.
 * No toca DB.
 */

import { parseDeliverablesJson, deliverableEditorPayloadSchema } from '@/lib/schemas/campaign-deliverables';

describe('parseDeliverablesJson', () => {
  it('retorna [] cuando el input es null/undefined/vacío', () => {
    expect(parseDeliverablesJson(null)).toEqual([]);
    expect(parseDeliverablesJson(undefined)).toEqual([]);
    expect(parseDeliverablesJson('')).toEqual([]);
    expect(parseDeliverablesJson('   ')).toEqual([]);
    expect(parseDeliverablesJson('[]')).toEqual([]);
  });

  it('parsea payload válido', () => {
    const json = JSON.stringify([
      { deliverableType: 'stream_integration', targetCount: 15 },
      { id: 42, deliverableType: 'preroll', targetCount: 12, notes: 'test' },
    ]);
    const out = parseDeliverablesJson(json);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ deliverableType: 'stream_integration', targetCount: 15 });
    expect(out[1]).toEqual({ id: 42, deliverableType: 'preroll', targetCount: 12, notes: 'test' });
  });

  it('acepta preroll como tipo (añadido al enum en esta PR)', () => {
    const out = parseDeliverablesJson(JSON.stringify([
      { deliverableType: 'preroll', targetCount: 5 },
    ]));
    expect(out).toHaveLength(1);
    expect(out[0]?.deliverableType).toBe('preroll');
  });

  it('NUNCA lanza en JSON inválido — retorna []', () => {
    expect(parseDeliverablesJson('not json')).toEqual([]);
    expect(parseDeliverablesJson('{"invalid":"shape"}')).toEqual([]);
    expect(parseDeliverablesJson(JSON.stringify([{ deliverableType: 'INVALID', targetCount: 1 }]))).toEqual([]);
    expect(parseDeliverablesJson(JSON.stringify([{ deliverableType: 'preroll', targetCount: 0 }]))).toEqual([]);
    expect(parseDeliverablesJson(JSON.stringify([{ deliverableType: 'preroll', targetCount: -1 }]))).toEqual([]);
  });

  it('descarta filas con targetCount fuera de rango', () => {
    const parsed = deliverableEditorPayloadSchema.safeParse([
      { deliverableType: 'stream_integration', targetCount: 1000 },
    ]);
    expect(parsed.success).toBe(false);
  });

  it('trim + limpia notas vacías', () => {
    const out = parseDeliverablesJson(JSON.stringify([
      { deliverableType: 'stream_integration', targetCount: 5, notes: '   ' },
    ]));
    expect(out[0]?.notes).toBeUndefined();
  });
});

describe('no impacta en el resto del CRM', () => {
  it('los tipos DELIVERABLE_TYPES incluyen preroll', () => {
    const { DELIVERABLE_TYPES } = jest.requireActual('@/lib/schemas/deliverable') as { DELIVERABLE_TYPES: readonly string[] };
    expect(DELIVERABLE_TYPES).toContain('preroll');
    expect(DELIVERABLE_TYPES).toContain('stream_integration');
    expect(DELIVERABLE_TYPES).toContain('otro');
  });
});
