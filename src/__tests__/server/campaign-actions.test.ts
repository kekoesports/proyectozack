/**
 * Tests for campaign server actions.
 *
 * Mocks: next/cache, @/lib/auth-guard, @/lib/queries/campaigns, @/lib/env, @/lib/auth
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

// ── Mock auth-guard ───────────────────────────────────────────────────────────

const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

// ── Mock queries ──────────────────────────────────────────────────────────────

const mockCreateCampaign = jest.fn();
const mockUpdateCampaign = jest.fn();
const mockArchiveCampaign = jest.fn();
const mockUnarchiveCampaign = jest.fn();
const mockAssertCanEditCampaign = jest.fn();

jest.mock('@/lib/queries/campaigns', () => ({
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
  updateCampaign: (...args: unknown[]) => mockUpdateCampaign(...args),
  archiveCampaign: (...args: unknown[]) => mockArchiveCampaign(...args),
  unarchiveCampaign: (...args: unknown[]) => mockUnarchiveCampaign(...args),
  assertCanEditCampaign: (...args: unknown[]) => mockAssertCanEditCampaign(...args),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  createCampaignAction,
  updateCampaignAction,
  archiveCampaignAction,
  unarchiveCampaignAction,
} from '@/app/admin/(dashboard)/campanas/actions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(role: string, id = 'user-1') {
  return { user: { id, email: `${role}@test.com`, name: role, role } };
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const validCampaignFields: Record<string, string> = {
  name: 'Test Campaign',
  brandId: '10',
  talentId: '20',
  actionType: 'stream',
  status: 'propuesta',
  amountBrand: '1000',
  amountTalent: '700',
  visibility: 'team',
};

// ── createCampaignAction ──────────────────────────────────────────────────────

describe('createCampaignAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates campaign and returns { success: true, id } with valid data', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockCreateCampaign.mockResolvedValue({ id: 42 });

    const fd = makeFormData(validCampaignFields);
    const result = await createCampaignAction(fd);

    expect(result).toEqual({ success: true, id: 42 });
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Campaign', createdByUserId: 'user-1' }),
    );
  });

  it('returns { success: false, error } when name is missing', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));

    const { name: _name, ...rest } = validCampaignFields;
    const fd = makeFormData(rest);
    const result = await createCampaignAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error } when actionType is invalid', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));

    const fd = makeFormData({ ...validCampaignFields, actionType: 'invalid_type' });
    const result = await createCampaignAction(fd);

    expect(result.success).toBe(false);
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error } when amountTalent > amountBrand', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));

    const fd = makeFormData({ ...validCampaignFields, amountBrand: '500', amountTalent: '800' });
    const result = await createCampaignAction(fd);

    expect(result.success).toBe(false);
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error } when DB throws', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockCreateCampaign.mockRejectedValue(new Error('DB connection failed'));

    const fd = makeFormData(validCampaignFields);
    const result = await createCampaignAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB connection failed');
    }
  });

  it('passes createdByUserId from session to createCampaign', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('staff', 'staff-user-99'));
    mockCreateCampaign.mockResolvedValue({ id: 7 });

    const fd = makeFormData(validCampaignFields);
    await createCampaignAction(fd);

    expect(mockCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ createdByUserId: 'staff-user-99' }),
    );
  });
});

// ── updateCampaignAction ──────────────────────────────────────────────────────

describe('updateCampaignAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates campaign and returns { success: true } with valid data', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockUpdateCampaign.mockResolvedValue({ id: 1 });

    const fd = makeFormData({ ...validCampaignFields, id: '1' });
    const result = await updateCampaignAction(fd);

    expect(result).toEqual({ success: true });
    expect(mockAssertCanEditCampaign).toHaveBeenCalledWith(1, expect.objectContaining({ role: 'admin' }));
    expect(mockUpdateCampaign).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('returns { success: false, error } when id is missing', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));

    const fd = makeFormData(validCampaignFields); // no id
    const result = await updateCampaignAction(fd);

    expect(result.success).toBe(false);
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error: "forbidden:edit:campaign" } when staff edits foreign campaign', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('staff', 'staff-user'));
    mockAssertCanEditCampaign.mockRejectedValue(new Error('forbidden:edit:campaign'));

    const fd = makeFormData({ ...validCampaignFields, id: '5' });
    const result = await updateCampaignAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('forbidden:edit:campaign');
    }
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error } when DB throws on update', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockUpdateCampaign.mockRejectedValue(new Error('constraint violation'));

    const fd = makeFormData({ ...validCampaignFields, id: '1' });
    const result = await updateCampaignAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('constraint violation');
    }
  });

  it('calls assertCanEditCampaign with session userId and role', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-42'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockUpdateCampaign.mockResolvedValue({ id: 3 });

    const fd = makeFormData({ ...validCampaignFields, id: '3' });
    await updateCampaignAction(fd);

    expect(mockAssertCanEditCampaign).toHaveBeenCalledWith(
      3,
      { userId: 'mgr-42', role: 'manager' },
    );
  });
});

// ── archiveCampaignAction ─────────────────────────────────────────────────────

describe('archiveCampaignAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives campaign and returns { success: true } for admin', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockArchiveCampaign.mockResolvedValue({ id: 1, archivedAt: new Date() });

    const result = await archiveCampaignAction(1);

    expect(result).toEqual({ success: true });
    expect(mockArchiveCampaign).toHaveBeenCalledWith(1);
  });

  it('archives campaign and returns { success: true } for manager', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager', 'mgr-1'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockArchiveCampaign.mockResolvedValue({ id: 1, archivedAt: new Date() });

    const result = await archiveCampaignAction(1);

    expect(result).toEqual({ success: true });
    expect(mockArchiveCampaign).toHaveBeenCalledWith(1);
  });

  it('returns { success: false, error: "forbidden:delete:staff" } for staff', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('staff'));

    const result = await archiveCampaignAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('forbidden:delete:staff');
    }
    expect(mockArchiveCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error: "forbidden:edit:campaign" } when admin edits foreign campaign (assertCanEditCampaign throws)', async () => {
    // In practice admin never fails assertCanEditCampaign, but test the path
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockAssertCanEditCampaign.mockRejectedValue(new Error('forbidden:edit:campaign'));

    const result = await archiveCampaignAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('forbidden:edit:campaign');
    }
    expect(mockArchiveCampaign).not.toHaveBeenCalled();
  });

  it('calls assertCanEditCampaign with correct id and session', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin', 'admin-user'));
    mockAssertCanEditCampaign.mockResolvedValue(undefined);
    mockArchiveCampaign.mockResolvedValue({ id: 7 });

    await archiveCampaignAction(7);

    expect(mockAssertCanEditCampaign).toHaveBeenCalledWith(
      7,
      { userId: 'admin-user', role: 'admin' },
    );
  });
});

// ── unarchiveCampaignAction ───────────────────────────────────────────────────

describe('unarchiveCampaignAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unarchives campaign and returns { success: true } for admin', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockUnarchiveCampaign.mockResolvedValue({ id: 1, archivedAt: null });

    const result = await unarchiveCampaignAction(1);

    expect(result).toEqual({ success: true });
    expect(mockUnarchiveCampaign).toHaveBeenCalledWith(1);
  });

  it('unarchives campaign and returns { success: true } for manager', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('manager'));
    mockUnarchiveCampaign.mockResolvedValue({ id: 1, archivedAt: null });

    const result = await unarchiveCampaignAction(1);

    expect(result).toEqual({ success: true });
    expect(mockUnarchiveCampaign).toHaveBeenCalledWith(1);
  });

  it('returns { success: false, error: "forbidden:delete:staff" } for staff', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('staff'));

    const result = await unarchiveCampaignAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('forbidden:delete:staff');
    }
    expect(mockUnarchiveCampaign).not.toHaveBeenCalled();
  });

  it('returns { success: false, error } when DB throws on unarchive', async () => {
    mockRequireAnyRole.mockResolvedValue(makeSession('admin'));
    mockUnarchiveCampaign.mockRejectedValue(new Error('DB error'));

    const result = await unarchiveCampaignAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});
