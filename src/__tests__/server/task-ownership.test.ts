jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

const mockGetTaskById = jest.fn();
const mockGetTasksByIds = jest.fn();
const mockUpdateTask = jest.fn();
const mockCompleteTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockDeleteTasks = jest.fn();
const mockIsAssignableTaskUser = jest.fn();
const mockResetRolledOver = jest.fn();
const mockResetRolledOverBulk = jest.fn();

jest.mock('@/lib/queries/crmTasks', () => ({
  getTaskById:         (...args: unknown[]) => mockGetTaskById(...args),
  getTasksByIds:       (...args: unknown[]) => mockGetTasksByIds(...args),
  updateTask:          (...args: unknown[]) => mockUpdateTask(...args),
  completeTask:        (...args: unknown[]) => mockCompleteTask(...args),
  deleteTask:          (...args: unknown[]) => mockDeleteTask(...args),
  deleteTasks:         (...args: unknown[]) => mockDeleteTasks(...args),
  isAssignableTaskUser:(...args: unknown[]) => mockIsAssignableTaskUser(...args),
  resetRolledOver:     (...args: unknown[]) => mockResetRolledOver(...args),
  resetRolledOverBulk: (...args: unknown[]) => mockResetRolledOverBulk(...args),
}));

jest.mock('@/lib/queries/alerts', () => ({ createAlert: jest.fn() }));

import {
  updateTaskAction,
  updateTaskPartialAction,
  completeTaskAction,
  deleteTaskAction,
  bulkDeleteTasksAction,
  resetRolledOverAction,
  resetRolledOverBulkAction,
} from '@/app/admin/(dashboard)/tareas/actions';

function makeSession(role: string, id = 'user-1') {
  return { user: { id, email: `${role}@test.com`, name: role, role } };
}

const OWN_TASK  = { id: 1, ownerId: 'user-1', assignedToUserId: 'user-1' };
const FOREIGN_TASK = { id: 2, ownerId: 'other', assignedToUserId: 'other' };

const VALID_TASK_INPUT = {
  title: 'Test task', description: null, ownerId: 'user-1',
  dueDate: null, priority: 'media' as const, status: 'pendiente' as const,
  category: 'ops', relatedType: 'general' as const,
};

describe('task ownership guards — admin_limited_tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAssignableTaskUser.mockResolvedValue(true);
    mockUpdateTask.mockResolvedValue({ id: 1 });
    mockCompleteTask.mockResolvedValue({ id: 1 });
    mockDeleteTask.mockResolvedValue(undefined);
    mockDeleteTasks.mockResolvedValue(undefined);
    mockResetRolledOver.mockResolvedValue(undefined);
    mockResetRolledOverBulk.mockResolvedValue(undefined);
  });

  // T1
  it('updateTaskAction: admin_limited_tasks puede editar tarea propia', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(OWN_TASK);

    const result = await updateTaskAction(1, VALID_TASK_INPUT);

    expect(result).toEqual({});
    expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.any(Object));
  });

  // T2
  it('updateTaskAction: admin_limited_tasks bloqueado en tarea ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(FOREIGN_TASK);

    const result = await updateTaskAction(2, VALID_TASK_INPUT);

    expect(result).toEqual({ error: 'Sin permiso para modificar esta tarea' });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  // T3
  it('updateTaskPartialAction: admin_limited_tasks puede parchear tarea propia', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(OWN_TASK);

    const result = await updateTaskPartialAction(1, { status: 'en_progreso' });

    expect(result).toEqual({});
    expect(mockUpdateTask).toHaveBeenCalled();
  });

  // T4
  it('updateTaskPartialAction: admin_limited_tasks bloqueado en tarea ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(FOREIGN_TASK);

    const result = await updateTaskPartialAction(2, { status: 'en_progreso' });

    expect(result).toEqual({ error: 'Sin permiso para modificar esta tarea' });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  // T5
  it('completeTaskAction: admin_limited_tasks puede completar tarea propia', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(OWN_TASK);

    const result = await completeTaskAction(1);

    expect(result).toEqual({});
    expect(mockCompleteTask).toHaveBeenCalledWith(1);
  });

  // T6
  it('completeTaskAction: admin_limited_tasks bloqueado en tarea ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(FOREIGN_TASK);

    const result = await completeTaskAction(2);

    expect(result).toEqual({ error: 'Sin permiso para completar esta tarea' });
    expect(mockCompleteTask).not.toHaveBeenCalled();
  });

  // T7
  it('deleteTaskAction: admin_limited_tasks puede eliminar tarea propia', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(OWN_TASK);

    const result = await deleteTaskAction(1);

    expect(result).toEqual({});
    expect(mockDeleteTask).toHaveBeenCalledWith(1);
  });

  // T8
  it('deleteTaskAction: admin_limited_tasks bloqueado en tarea ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTaskById.mockResolvedValue(FOREIGN_TASK);

    const result = await deleteTaskAction(2);

    expect(result).toEqual({ error: 'Sin permiso para eliminar esta tarea' });
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  // T9
  it('bulkDeleteTasksAction: admin_limited_tasks puede borrar en lote tareas propias', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTasksByIds.mockResolvedValue([OWN_TASK, { ...OWN_TASK, id: 2 }]);

    const result = await bulkDeleteTasksAction([1, 2]);

    expect(result).toEqual({});
    expect(mockDeleteTasks).toHaveBeenCalledWith([1, 2]);
  });

  // T10
  it('bulkDeleteTasksAction: rechaza todo el lote si alguna tarea es ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));
    mockGetTasksByIds.mockResolvedValue([OWN_TASK, FOREIGN_TASK]);

    const result = await bulkDeleteTasksAction([1, 2]);

    expect(result).toHaveProperty('error');
    expect(mockDeleteTasks).not.toHaveBeenCalled();
  });

  // T11
  it('resetRolledOverAction: rol no-admin pasa callerId al filtro de propiedad', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));

    await resetRolledOverAction(5);

    expect(mockResetRolledOver).toHaveBeenCalledWith(5, 'user-1');
  });

  // T12
  it('resetRolledOverBulkAction: rol no-admin pasa callerId al filtro de propiedad', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin_limited_tasks', 'user-1'));

    await resetRolledOverBulkAction([3, 4]);

    expect(mockResetRolledOverBulk).toHaveBeenCalledWith([3, 4], 'user-1');
  });
});
