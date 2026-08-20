jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockCompleteTask = jest.fn();
const mockIsAssignableTaskUser = jest.fn();
const mockGetTaskById = jest.fn();

jest.mock('@/lib/queries/crmTasks', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  completeTask: (...args: unknown[]) => mockCompleteTask(...args),
  isAssignableTaskUser: (...args: unknown[]) => mockIsAssignableTaskUser(...args),
  getTaskById: (...args: unknown[]) => mockGetTaskById(...args),
}));

jest.mock('@/lib/queries/alerts', () => ({
  createAlert: jest.fn(),
}));

import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from '@/app/admin/(dashboard)/tareas/actions';

function makeSession(role: string, id = 'user-1') {
  return { user: { id, email: `${role}@test.com`, name: role, role } };
}

describe('task actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAssignableTaskUser.mockResolvedValue(true);
    mockUpdateTask.mockResolvedValue({ id: 1 });
    mockGetTaskById.mockResolvedValue(null);
  });

  it('createTaskAction writes createdByUserId and syncs owner with assignedTo', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-1'));
    mockCreateTask.mockResolvedValue({ id: 1 });

    await createTaskAction({
      title: 'Preparar seguimiento',
      description: null,
      ownerId: 'staff-2',
      dueDate: '2026-05-04',
      priority: 'media',
      status: 'pendiente',
      category: 'ops',
      relatedType: 'general',
    });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'staff-2',
        assignedToUserId: 'staff-2',
        createdByUserId: 'mgr-1',
      }),
    );
  });

  it('updateTaskAction keeps owner and assignee aligned', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin', 'admin-1'));

    await updateTaskAction(7, {
      title: 'Actualizar estado',
      description: null,
      ownerId: 'staff-3',
      dueDate: null,
      priority: 'alta',
      status: 'en_progreso',
      category: 'ops',
      relatedType: 'general',
    });

    expect(mockUpdateTask).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        ownerId: 'staff-3',
        assignedToUserId: 'staff-3',
      }),
    );
  });

  // La regla ya no es 'un manager nunca borra': un no-admin puede borrar una
  // tarea suya. El test anterior no configuraba getTaskById, así que salía por
  // 'Tarea no encontrada' sin llegar a evaluar permisos — pasaba por el motivo
  // equivocado y dejó de reflejar el comportamiento real.
  it('deleteTaskAction impide a un manager borrar una tarea ajena', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-1'));
    mockGetTaskById.mockResolvedValue({ id: 9, ownerId: 'otro', assignedToUserId: 'otro' });

    const result = await deleteTaskAction(9);

    expect(result).toEqual({ error: 'Sin permiso para eliminar esta tarea' });
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('deleteTaskAction permite a un manager borrar una tarea propia', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-1'));
    mockGetTaskById.mockResolvedValue({ id: 9, ownerId: 'mgr-1', assignedToUserId: null });

    const result = await deleteTaskAction(9);

    expect(result).toEqual({});
    expect(mockDeleteTask).toHaveBeenCalledWith(9);
  });

  it('deleteTaskAction deja a un admin borrar sin comprobar propiedad', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin', 'admin-1'));

    const result = await deleteTaskAction(9);

    expect(result).toEqual({});
    expect(mockDeleteTask).toHaveBeenCalledWith(9);
    // Un admin no necesita cargar la tarea para decidir.
    expect(mockGetTaskById).not.toHaveBeenCalled();
  });
});
