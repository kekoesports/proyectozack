jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));
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

jest.mock('@/lib/queries/crmTasks', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  completeTask: (...args: unknown[]) => mockCompleteTask(...args),
  isAssignableTaskUser: (...args: unknown[]) => mockIsAssignableTaskUser(...args),
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

  it('deleteTaskAction blocks manager deletes', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-1'));

    const result = await deleteTaskAction(9);

    expect(result).toEqual({ error: 'Sin permiso para eliminar' });
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});
