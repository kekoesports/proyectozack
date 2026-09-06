import { notFound, redirect } from 'next/navigation';
import {
  requireCreator,
  requireStudioAgency,
  requireStudioSession,
  requireStudioWriter,
} from '@/lib/studio/access';

const mockSession = jest.fn<Promise<unknown>, []>();
const mockMembership = jest.fn<Promise<unknown>, []>();
const mockRepository = jest.fn();
const mockAgency = jest.fn();
let mockWorkspace: string | undefined;
let mockEnabled = true;
jest.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: async () => ({ get: () => mockWorkspace === undefined ? undefined : { value: mockWorkspace } }),
}));
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/env', () => ({
  env: {
    get STUDIO_ENABLED() {
      return mockEnabled;
    },
  },
}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: () => mockSession() } },
}));
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockAgency(...args),
}));
jest.mock('@/lib/studio/repository', () => ({
  createStudioRepository: (...args: unknown[]) => {
    mockRepository(...args);
    return { membership: () => mockMembership() };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEnabled = true;
  mockWorkspace = undefined;
  jest.mocked(notFound).mockImplementation(() => {
    throw new Error('NOT_FOUND');
  });
  jest.mocked(redirect).mockImplementation((path) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockSession.mockResolvedValue({ user: { id: 'fixture-session-user' } });
  mockMembership.mockResolvedValue({ talentId: 5, name: 'Fixture only' });
});

test('feature flag rejects before session or database access', async () => {
  mockEnabled = false;
  await expect(requireStudioSession()).rejects.toThrow('NOT_FOUND');
  expect(mockSession).not.toHaveBeenCalled();
  await expect(requireStudioAgency()).rejects.toThrow('NOT_FOUND');
  expect(mockAgency).not.toHaveBeenCalled();
});
test('anonymous creator access goes to login, never to the repository', async () => {
  mockSession.mockResolvedValue(null);
  await expect(requireCreator()).rejects.toThrow('REDIRECT:/studio/login');
  expect(mockRepository).not.toHaveBeenCalled();
});
test('membership is resolved from authenticated user, not a requested talent ID', async () => {
  const result = await requireCreator();
  expect(result.member.talentId).toBe(5);
  expect(mockRepository).toHaveBeenCalledWith({}, 'fixture-session-user', undefined);
});
test('revoked or missing membership blocks existing session', async () => {
  mockMembership.mockResolvedValue(null);
  await expect(requireCreator()).rejects.toThrow('REDIRECT:/studio/access');
});
test('agency entry delegates only admin and manager to the existing role guard', async () => {
  await requireStudioAgency();
  expect(mockAgency).toHaveBeenCalledWith(['admin', 'manager'], '/admin/login');
});
test('existing agency login reaches CRM Studio without impersonating a creator', async () => {
  mockSession.mockResolvedValue({ user: { id: 'agency', role: 'admin' } });
  mockMembership.mockResolvedValue(null);
  await expect(requireCreator()).rejects.toThrow('REDIRECT:/admin/studio');
});
test('a limited CRM role is not upgraded to agency by entering Studio', async () => {
  mockSession.mockResolvedValue({ user: { id: 'limited', role: 'admin_limited_tasks' } });
  mockMembership.mockResolvedValue(null);
  await expect(requireCreator()).rejects.toThrow('REDIRECT:/studio/access');
});

test.each(['admin', 'manager'])('selected workspace preserves the actual %s actor', async (role) => {
  mockSession.mockResolvedValue({ user: { id: 'agency', role } });
  mockWorkspace = '5';
  expect((await requireCreator()).agencyTalentId).toBe(5);
  expect(mockRepository).toHaveBeenCalledWith({}, 'agency', 5);
  expect(mockAgency).toHaveBeenCalledWith(['admin', 'manager'], '/admin/login');
});

test.each(['creator', 'staff', 'admin_limited_tasks'])('%s cannot grant access using the selection cookie', async (role) => {
  mockSession.mockResolvedValue({ user: { id: 'restricted', role } });
  mockWorkspace = '99';
  expect((await requireCreator()).agencyTalentId).toBeUndefined();
  expect(mockRepository).toHaveBeenCalledWith({}, 'restricted', undefined);
  expect(mockAgency).not.toHaveBeenCalled();
});

test.each(['-1', '1.5', '0', 'true', '99999999999999'])('invalid selection %s never reaches the query scope', async (value) => {
  mockSession.mockResolvedValue({ user: { id: 'agency', role: 'admin' } });
  mockWorkspace = value;
  expect((await requireCreator()).agencyTalentId).toBeUndefined();
});

test.each(['admin', 'creator'])('%s mutations require the page workspace, including after leaving agency mode', async (role) => {
  mockSession.mockResolvedValue({ user: { id: 'actor', role } });
  if (role === 'admin') mockWorkspace = '5';
  expect(await requireStudioWriter(9)).toBeNull();
  expect(await requireStudioWriter(undefined)).toBeNull();
  expect((await requireStudioWriter(5))?.member.talentId).toBe(5);
  mockWorkspace = undefined;
  expect(await requireStudioWriter(9)).toBeNull();
});
