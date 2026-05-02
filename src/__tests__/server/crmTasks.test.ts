jest.mock('@/lib/auth', () => ({ auth: {} }));

type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  then: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const resolved = Promise.resolve(resolvedValue);
  const builder: SelectBuilder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
};

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

import {
  buildRecurringTaskInstances,
  getTaskRelatedOptions,
  getTasksForWeek,
  getUrgentTasks,
} from '@/lib/queries/crmTasks';

describe('buildRecurringTaskInstances', () => {
  const baseTemplate = {
    id: 1,
    title: 'Revisar correos',
    description: null,
    category: 'comunicacion',
    defaultPriority: 'alta' as const,
    recurrence: 'weekly' as const,
    defaultAssigneeUserId: null,
    active: true,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
  };

  const users = [
    { id: 'admin-1', role: 'admin' },
    { id: 'manager-1', role: 'manager' },
    { id: 'staff-1', role: 'staff' },
  ] as const;

  it('creates one weekly task per internal user when template has no default assignee', () => {
    const rows = buildRecurringTaskInstances({
      templates: [baseTemplate],
      users,
      fallbackCreatorUserId: 'admin-1',
      today: new Date('2026-05-04T08:00:00Z'),
      weekLabel: '2026-W19',
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        title: 'Revisar correos',
        weekLabel: '2026-W19',
        dueDate: '2026-05-10',
        ownerId: 'admin-1',
        assignedToUserId: 'admin-1',
        createdByUserId: 'admin-1',
        recurrenceTemplateId: 1,
      }),
    );
    expect(rows[1]?.assignedToUserId).toBe('manager-1');
    expect(rows[2]?.assignedToUserId).toBe('staff-1');
    expect(rows.every((row) => row.createdByUserId === 'admin-1')).toBe(true);
  });

  it('creates a single recurring task for the template default assignee', () => {
    const rows = buildRecurringTaskInstances({
      templates: [{ ...baseTemplate, defaultAssigneeUserId: 'staff-1' }],
      users,
      fallbackCreatorUserId: 'admin-1',
      today: new Date('2026-05-04T08:00:00Z'),
      weekLabel: '2026-W19',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        ownerId: 'staff-1',
        assignedToUserId: 'staff-1',
        createdByUserId: 'staff-1',
      }),
    );
  });

  it('uses today for daily tasks and skips monthly templates outside day one', () => {
    const rows = buildRecurringTaskInstances({
      templates: [
        { ...baseTemplate, id: 2, recurrence: 'daily' },
        { ...baseTemplate, id: 3, recurrence: 'monthly' },
      ],
      users,
      fallbackCreatorUserId: 'admin-1',
      today: new Date('2026-05-04T08:00:00Z'),
      weekLabel: '2026-W19',
    });

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.recurrenceTemplateId === 2)).toBe(true);
    expect(rows.every((row) => row.dueDate === '2026-05-04')).toBe(true);
  });

  it('creates monthly tasks on the first day of the month with end-of-month due date', () => {
    const rows = buildRecurringTaskInstances({
      templates: [{ ...baseTemplate, id: 4, recurrence: 'monthly' }],
      users,
      fallbackCreatorUserId: 'admin-1',
      today: new Date('2026-05-01T08:00:00Z'),
      weekLabel: '2026-W18',
    });

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.dueDate === '2026-05-31')).toBe(true);
  });
});

describe('getTaskRelatedOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns campaigns alongside brand, talent, invoice, and general options', async () => {
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeSelectBuilder([{ id: 1, name: 'Brand A' }]);
      if (call === 2) return makeSelectBuilder([{ id: 2, name: 'Talent B' }]);
      if (call === 3) return makeSelectBuilder([{ id: 3, number: 'FAC-1', concept: 'Fee' }]);
      return makeSelectBuilder([{ id: 4, name: 'Launch', brandName: 'Brand A', talentName: 'Talent B' }]);
    });

    const result = await getTaskRelatedOptions();

    expect(result.brand).toEqual([{ id: 1, label: 'Brand A' }]);
    expect(result.talent).toEqual([{ id: 2, label: 'Talent B' }]);
    expect(result.invoice).toEqual([{ id: 3, label: 'FAC-1 — Fee' }]);
    expect(result.campaign).toEqual([{ id: 4, label: 'Brand A × Talent B' }]);
    expect(result.general).toEqual([]);
  });
});

describe('getTasksForWeek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies a visibility filter for staff sessions', async () => {
    mockSelect.mockImplementation(() => makeSelectBuilder([{ id: 1, title: 'Task' }]));

    const result = await getTasksForWeek('2026-W19', {
      session: { role: 'staff', userId: 'staff-1' },
    });

    expect(result).toHaveLength(1);
    const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
    expect(builder.where).toHaveBeenCalled();
  });

  it('does not restrict admin sessions beyond week filtering', async () => {
    mockSelect.mockImplementation(() => makeSelectBuilder([{ id: 1 }, { id: 2 }]));

    const result = await getTasksForWeek('2026-W19', {
      session: { role: 'admin', userId: 'admin-1' },
    });

    expect(result).toHaveLength(2);
  });
});

describe('getUrgentTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps rows into urgent task cards with due dates and owner names', async () => {
    mockSelect.mockImplementation(() =>
      makeSelectBuilder([
        {
          id: 9,
          title: 'Enviar factura',
          priority: 'alta',
          dueDate: '2026-05-04',
          ownerName: 'Ana',
        },
      ]),
    );

    const result = await getUrgentTasks({
      session: { role: 'staff', userId: 'staff-1' },
      limit: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 9, title: 'Enviar factura', priority: 'alta', ownerName: 'Ana' }),
    );
    expect(result[0]?.dueDate?.toISOString().slice(0, 10)).toBe('2026-05-04');
  });
});
