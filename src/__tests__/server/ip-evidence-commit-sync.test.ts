jest.mock('server-only', () => ({}));
const selectWhere = jest.fn();
const returning = jest.fn();
const onConflictDoNothing = jest.fn(() => ({ returning }));
const values = jest.fn(() => ({ onConflictDoNothing }));
jest.mock('@/lib/db', () => ({ db: {
  select: () => ({ from: () => ({ where: selectWhere }) }),
  insert: () => ({ values }),
} }));

import { syncGithubCommitEvidence } from '@/lib/services/ipEvidenceCommitSync';

beforeEach(() => {
  jest.clearAllMocks();
  selectWhere.mockResolvedValue([{ id: 1, repositoryRef: 'example/project',
    evidenceTrackingStartedAt: new Date('2026-09-01T00:00:00Z') }]);
  returning.mockResolvedValue([{ id: 1 }]);
});
afterEach(() => jest.restoreAllMocks());

it('excludes history, preserves identity on replay and never invents costs or deployment', async () => {
  const record = (date: string) => ({ sha: 'a'.repeat(40), html_url: 'https://github.com/example/project/commit/example',
    commit: { message: 'fix: synthetic evidence', committer: { date } } });
  jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify([
    record('2026-09-02T00:00:00Z'), record('2026-08-01T00:00:00Z'),
  ])));
  expect(await syncGithubCommitEvidence()).toMatchObject({ discovered: 1, inserted: 1, errors: 0 });
  expect(values).toHaveBeenCalledWith([expect.objectContaining({
    externalId: `github:example/project:commit:${'a'.repeat(40)}`,
    sourceMetadata: expect.objectContaining({ hoursNotInferred: true, deploymentNotProven: true }),
  })]);
  returning.mockResolvedValue([]);
  expect(await syncGithubCommitEvidence()).toMatchObject({ discovered: 1, inserted: 0, errors: 0 });
  expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
});

it('rejects malformed provider data without persisting a partial success', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify([{ sha: 'invalid' }])));
  expect(await syncGithubCommitEvidence()).toMatchObject({ inserted: 0, errors: 1 });
  expect(values).not.toHaveBeenCalled();
});
