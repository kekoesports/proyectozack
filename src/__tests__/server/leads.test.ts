jest.mock('@/lib/auth', () => ({ auth: {} }));

type Builder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  then: jest.Mock;
};

/** Builder encadenable y thenable — mismo patrón que crmBrands.test.ts. */
const makeBuilder = (resolvedValue: unknown[]): Builder => {
  const resolved = Promise.resolve(resolvedValue);
  const b: Builder = {
    from: jest.fn(), leftJoin: jest.fn(), where: jest.fn(), orderBy: jest.fn(),
    limit: jest.fn(), set: jest.fn(), returning: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  b.from.mockReturnValue(b);
  b.leftJoin.mockReturnValue(b);
  b.where.mockReturnValue(b);
  b.set.mockReturnValue(b);
  b.orderBy.mockResolvedValue(resolvedValue);
  b.limit.mockResolvedValue(resolvedValue);
  b.returning.mockResolvedValue(resolvedValue);
  return b;
};

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockDb = { select: mockSelect, update: mockUpdate };
jest.mock('@/lib/db', () => ({ db: mockDb }));

// ── Imports after mocks ───────────────────────────────────────────────────────
import {
  listLeads,
  getLeadById,
  updateLeadStatus,
  assignLead,
  addLeadNote,
} from '@/lib/queries/leads';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

const BASE_LEAD = {
  id: 1,
  name: 'Ana',
  email: 'ana@example.test',
  type: 'brand',
  message: 'Hola',
  status: 'nuevo' as const,
  assignedToId: null,
  notes: null,
  respondedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('listLeads', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('sin filtros no aplica cláusula where', async () => {
    const b = makeBuilder([BASE_LEAD]);
    mockSelect.mockReturnValue(b);

    const result = await listLeads();

    expect(result).toHaveLength(1);
    expect(b.where).toHaveBeenCalledWith(undefined);
  });

  it('combina status + type + assignedToId en una sola where', async () => {
    const b = makeBuilder([]);
    mockSelect.mockReturnValue(b);

    await listLeads({ status: 'contactado', type: 'brand', assignedToId: 'u1' });

    expect(b.where).toHaveBeenCalledTimes(1);
    expect(b.where.mock.calls[0]?.[0]).toBeDefined();
  });

  it('unassigned tiene prioridad sobre assignedToId', async () => {
    const b = makeBuilder([]);
    mockSelect.mockReturnValue(b);

    await listLeads({ unassigned: true, assignedToId: 'u1' });

    expect(b.where).toHaveBeenCalledTimes(1);
  });

  it('search vacío o en blanco no añade filtro', async () => {
    const b = makeBuilder([]);
    mockSelect.mockReturnValue(b);

    await listLeads({ search: '   ' });

    expect(b.where).toHaveBeenCalledWith(undefined);
  });

  it('ordena por fecha descendente', async () => {
    const b = makeBuilder([]);
    mockSelect.mockReturnValue(b);

    await listLeads();

    expect(b.orderBy).toHaveBeenCalledTimes(1);
  });
});

describe('getLeadById', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('devuelve el lead cuando existe', async () => {
    mockSelect.mockReturnValue(makeBuilder([{ ...BASE_LEAD, assignedToName: null }]));
    const lead = await getLeadById(1);
    expect(lead?.id).toBe(1);
  });

  it('devuelve undefined cuando no existe', async () => {
    mockSelect.mockReturnValue(makeBuilder([]));
    const lead = await getLeadById(999);
    expect(lead).toBeUndefined();
  });
});

describe('updateLeadStatus', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('devuelve undefined si el lead no existe', async () => {
    mockSelect.mockReturnValue(makeBuilder([]));
    const res = await updateLeadStatus(999, 'contactado', 'u1');
    expect(res).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si el status no cambia', async () => {
    mockSelect.mockReturnValue(makeBuilder([{ status: 'nuevo', notes: null }]));
    const res = await updateLeadStatus(1, 'nuevo', 'u1');
    expect(res).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('registra la transición en el log append-only sin pisar lo anterior', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder([{ status: 'nuevo', notes: '[2026-01-01T00:00:00.000Z] Ana: nota previa' }]);
      return makeBuilder([{ name: 'Bea' }]); // resolveActorName
    });
    const upd = makeBuilder([{ ...BASE_LEAD, status: 'contactado' }]);
    mockUpdate.mockReturnValue(upd);

    await updateLeadStatus(1, 'contactado', 'u2');

    const notes = upd.set.mock.calls[0]?.[0]?.notes as string;
    expect(notes).toContain('nota previa');
    expect(notes).toContain('Bea: status nuevo → contactado');
    expect(notes.split('\n')).toHaveLength(2);
  });

  it('sella respondedAt al salir de nuevo', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder([{ status: 'nuevo', notes: null }]);
      return makeBuilder([{ name: 'Bea' }]);
    });
    const upd = makeBuilder([BASE_LEAD]);
    mockUpdate.mockReturnValue(upd);

    await updateLeadStatus(1, 'ganado', 'u2');

    expect(upd.set.mock.calls[0]?.[0]).toHaveProperty('respondedAt');
  });

  it('no sella respondedAt al volver a nuevo', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder([{ status: 'contactado', notes: null }]);
      return makeBuilder([{ name: 'Bea' }]);
    });
    const upd = makeBuilder([BASE_LEAD]);
    mockUpdate.mockReturnValue(upd);

    await updateLeadStatus(1, 'nuevo', 'u2');

    expect(upd.set.mock.calls[0]?.[0]).not.toHaveProperty('respondedAt');
  });
});

describe('assignLead', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('asigna un owner', async () => {
    const upd = makeBuilder([{ ...BASE_LEAD, assignedToId: 'u9' }]);
    mockUpdate.mockReturnValue(upd);

    const res = await assignLead(1, 'u9');

    expect(upd.set).toHaveBeenCalledWith({ assignedToId: 'u9' });
    expect(res?.assignedToId).toBe('u9');
  });

  it('desasigna con null', async () => {
    const upd = makeBuilder([BASE_LEAD]);
    mockUpdate.mockReturnValue(upd);

    await assignLead(1, null);

    expect(upd.set).toHaveBeenCalledWith({ assignedToId: null });
  });

  it('devuelve undefined si el id no existe', async () => {
    mockUpdate.mockReturnValue(makeBuilder([]));
    await expect(assignLead(999, 'u9')).resolves.toBeUndefined();
  });
});

describe('addLeadNote', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('rechaza notas vacías sin tocar la DB', async () => {
    const res = await addLeadNote(1, '   ', 'u1');
    expect(res).toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('devuelve undefined si el lead no existe', async () => {
    mockSelect.mockReturnValue(makeBuilder([]));
    const res = await addLeadNote(999, 'hola', 'u1');
    expect(res).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('append: conserva las notas previas', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder([{ notes: 'linea previa' }]);
      return makeBuilder([{ name: 'Bea' }]);
    });
    const upd = makeBuilder([BASE_LEAD]);
    mockUpdate.mockReturnValue(upd);

    await addLeadNote(1, 'nueva nota', 'u2');

    const notes = upd.set.mock.calls[0]?.[0]?.notes as string;
    expect(notes.startsWith('linea previa\n')).toBe(true);
    expect(notes).toContain('Bea: nueva nota');
  });

  it('cae al userId cuando el autor no se resuelve', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder([{ notes: null }]);
      return makeBuilder([]); // usuario no encontrado
    });
    const upd = makeBuilder([BASE_LEAD]);
    mockUpdate.mockReturnValue(upd);

    await addLeadNote(1, 'nota', 'u-desconocido');

    expect(upd.set.mock.calls[0]?.[0]?.notes as string).toContain('u-desconocido: nota');
  });
});

describe('RBAC del módulo leads', () => {
  it('analyst no tiene lectura (criterio de aceptación: 403)', () => {
    expect(hasPermission('analyst', 'leads', 'read')).toBe(false);
  });

  it('los roles operativos leen', () => {
    for (const role of ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops', 'talent_manager'] as const) {
      expect(hasPermission(role, 'leads', 'read')).toBe(true);
    }
  });

  it('talent_manager lee pero no escribe', () => {
    expect(hasPermission('talent_manager', 'leads', 'read')).toBe(true);
    expect(hasPermission('talent_manager', 'leads', 'write')).toBe(false);
  });

  it('solo admin y admin_limited_tasks borran', () => {
    expect(hasPermission('admin', 'leads', 'delete')).toBe(true);
    expect(hasPermission('admin_limited_tasks', 'leads', 'delete')).toBe(true);
    expect(hasPermission('manager', 'leads', 'delete')).toBe(false);
    expect(hasPermission('staff', 'leads', 'delete')).toBe(false);
  });

  it('el módulo está declarado en PERMISSIONS', () => {
    expect(PERMISSIONS.leads).toBeDefined();
  });
});
