import AdminTargetsPage from '@/app/admin/(dashboard)/targets/page';
import { listCreatorSearchProfiles, seedCreatorSearchProfile } from '@/lib/queries/creatorSearchProfiles';
import { DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';

jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: jest.fn().mockResolvedValue({ user: { id: 'fixture-actor', role: 'admin' } }),
}));
jest.mock('@/lib/queries/targets', () => ({ getAllTargets: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/queries/brandUsers', () => ({ getAllBrandUsers: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/queries/creatorDiscoveryRuns', () => ({ listRecentCreatorDiscoveryRuns: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/queries/creatorSearchProfiles', () => ({
  listCreatorSearchProfiles: jest.fn(), listAutomationRegistry: jest.fn().mockResolvedValue([]), seedCreatorSearchProfile: jest.fn(),
}));
jest.mock('@/app/admin/(dashboard)/targets/profile-actions', () => ({
  saveSearchProfileAction: jest.fn(), runSearchProfileAction: jest.fn(), updateCreatorFeedbackAction: jest.fn(),
}));
jest.mock('@/app/admin/(dashboard)/targets/actions', () => ({}));
jest.mock('@/app/admin/(dashboard)/targets/discovery-actions', () => ({}));
jest.mock('@/app/admin/(dashboard)/targets/youtube-actions', () => ({}));

it('projects only editable profile fields across the client boundary and never seeds on page read', async () => {
  jest.mocked(listCreatorSearchProfiles).mockResolvedValue([{
    id: 1, name: 'Synthetic profile', config: DEFAULT_CREATOR_SEARCH_PROFILE, enabled: false, version: 9,
    nextRunAt: null, lastRunAt: null, leaseToken: 'synthetic-private-lease', leaseUntil: new Date(),
    createdBy: 'synthetic-private-owner', createdAt: new Date(), updatedAt: new Date(),
  }]);
  const serialized = JSON.stringify(await AdminTargetsPage());
  expect(serialized).toContain('Synthetic profile');
  expect(serialized).toContain('"version":9');
  expect(serialized).not.toContain('synthetic-private-lease');
  expect(serialized).not.toContain('synthetic-private-owner');
  expect(serialized).not.toContain('leaseToken');
  expect(seedCreatorSearchProfile).not.toHaveBeenCalled();
});
