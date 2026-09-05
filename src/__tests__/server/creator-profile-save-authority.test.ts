const mockPermission = jest.fn();
const mockSave = jest.fn();
const mockGates = jest.fn();
const mockRun = jest.fn();
jest.mock('@/lib/permissions', () => ({ requirePermission: (...args: unknown[]) => mockPermission(...args) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/queries/creatorSearchProfiles', () => ({ saveCreatorSearchProfile: (...args: unknown[]) => mockSave(...args), recordCreatorFeedback: jest.fn() }));
jest.mock('@/lib/queries/creatorProviderReadiness', () => ({ getCreatorProviderReadiness: () => mockGates(), recordCreatorPreflight: jest.fn() }));
jest.mock('@/lib/services/creatorSearchProfiles', () => ({ runCreatorSearchProfile: (...args: unknown[]) => mockRun(...args) }));
import { saveSearchProfileAction } from '@/app/admin/(dashboard)/targets/profile-actions';
import { DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';

describe('search profile save/enable authority without provider or database access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission.mockResolvedValue({ user: { id: 'synthetic-operator' } });
    mockSave.mockResolvedValue({ id: 7 });
    mockGates.mockResolvedValue([{ platform: 'youtube', ready: false }]);
  });
  it('allows saving a paused profile without provider permission and does not start discovery', async () => {
    await expect(saveSearchProfileAction(DEFAULT_CREATOR_SEARCH_PROFILE)).resolves.toEqual({ ok: true, error: null });
    expect(mockPermission).toHaveBeenCalledWith('targets', 'write');
    expect(mockGates).not.toHaveBeenCalled();
    expect(mockRun).not.toHaveBeenCalled();
  });
  it('rejects enabling when no selected platform has verified authority', async () => {
    await expect(saveSearchProfileAction({ ...DEFAULT_CREATOR_SEARCH_PROFILE, enabled: true })).resolves.toMatchObject({ ok: false });
    expect(mockSave).not.toHaveBeenCalled();
  });
  it('cannot use an unrelated approved provider to authorize a selected provider', async () => {
    mockGates.mockResolvedValue([{ platform: 'twitch', ready: true }, { platform: 'youtube', ready: false }]);
    await expect(saveSearchProfileAction({ ...DEFAULT_CREATOR_SEARCH_PROFILE, enabled: true, platforms: ['youtube'] })).resolves.toMatchObject({ ok: false });
    expect(mockSave).not.toHaveBeenCalled();
  });
  it('saves an eligible profile using the supplied optimistic version without launching it', async () => {
    mockGates.mockResolvedValue([{ platform: 'youtube', ready: true }]);
    const config = { ...DEFAULT_CREATOR_SEARCH_PROFILE, enabled: true };
    await expect(saveSearchProfileAction(config, { id: 7, version: 3 })).resolves.toEqual({ ok: true, error: null });
    expect(mockSave).toHaveBeenCalledWith(config, 'synthetic-operator', { id: 7, version: 3 });
    expect(mockRun).not.toHaveBeenCalled();
  });
  it('reports a stale optimistic edit instead of claiming it was saved', async () => {
    mockSave.mockRejectedValueOnce(new Error('creator_profile_changed_reload'));
    await expect(saveSearchProfileAction(DEFAULT_CREATOR_SEARCH_PROFILE, { id: 7, version: 3 })).resolves.toMatchObject({ ok: false, error: expect.stringContaining('Otro usuario') });
  });
  it('does not read gates or save when the actor lacks write permission', async () => {
    mockPermission.mockRejectedValueOnce(new Error('Forbidden synthetic actor'));
    await expect(saveSearchProfileAction(DEFAULT_CREATOR_SEARCH_PROFILE)).rejects.toThrow('Forbidden');
    expect(mockGates).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
