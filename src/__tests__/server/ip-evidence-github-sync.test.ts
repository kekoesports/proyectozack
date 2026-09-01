const selectWhere = jest.fn();
const insertReturning = jest.fn();
const insertValues = jest.fn((_rows: readonly Record<string, unknown>[]) => ({
  onConflictDoNothing: () => ({ returning: insertReturning }),
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: selectWhere }) }),
    insert: () => ({ values: insertValues }),
  },
}));

import {
  parseGithubRepositoryRef,
  syncGithubIpEvidence,
} from '@/lib/services/ipEvidenceGithubSync';

describe('sincronización prospectiva de evidencia IP desde GitHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectWhere.mockResolvedValue([{
      id: 7,
      repositoryRef: 'https://github.com/kekoesports/proyectozack',
      evidenceTrackingStartedAt: new Date('2026-09-01T00:00:00Z'),
    }]);
    insertReturning.mockResolvedValue([{ id: 99 }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['https://github.com/kekoesports/proyectozack', 'kekoesports', 'proyectozack'],
    ['git@github.com:kekoesports/proyectozack.git', 'kekoesports', 'proyectozack'],
    ['kekoesports/proyectozack', 'kekoesports', 'proyectozack'],
  ])('reconoce una referencia de repositorio %s', (value, owner, repository) => {
    expect(parseGithubRepositoryRef(value)).toEqual({ owner, repository });
  });

  it('ignora referencias que no son repositorios GitHub inequívocos', () => {
    expect(parseGithubRepositoryRef('carpeta técnica interna')).toBeNull();
    expect(parseGithubRepositoryRef(null)).toBeNull();
  });

  it('solo registra PR fusionados desde el inicio del seguimiento y no crea horas', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      {
        number: 401,
        title: 'feat: evidencia prospectiva',
        html_url: 'https://github.com/kekoesports/proyectozack/pull/401',
        merged_at: '2026-09-01T18:00:00Z',
        merge_commit_sha: 'merge-sha',
        user: { login: 'kekoesports' },
        merged_by: { login: 'kekoesports' },
        head: { sha: 'head-sha' },
        base: { ref: 'master' },
      },
      {
        number: 398,
        title: 'docs: anterior al seguimiento',
        html_url: 'https://github.com/kekoesports/proyectozack/pull/398',
        merged_at: '2026-08-31T23:59:59Z',
        merge_commit_sha: 'old-sha',
        user: { login: 'kekoesports' },
        merged_by: { login: 'kekoesports' },
        head: { sha: 'old-head' },
        base: { ref: 'master' },
      },
      {
        number: 402,
        title: 'feat: todavía abierto',
        html_url: 'https://github.com/kekoesports/proyectozack/pull/402',
        merged_at: null,
        merge_commit_sha: null,
        user: { login: 'kekoesports' },
        merged_by: null,
        head: { sha: 'open-head' },
        base: { ref: 'master' },
      },
    ]), { status: 200 }));

    await expect(syncGithubIpEvidence()).resolves.toEqual({
      projectsChecked: 1,
      repositoriesSynced: 1,
      discovered: 1,
      inserted: 1,
      skipped: 0,
      errors: 0,
    });

    const rows = insertValues.mock.calls[0]?.[0] as readonly Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      projectId: 7,
      externalId: 'github:kekoesports/proyectozack:pr:401',
      evidenceKind: 'github_pr',
    });
    expect(rows[0]).not.toHaveProperty('minutes');
    expect(rows[0]).not.toHaveProperty('provisionalAssessment');
  });

  it('tolera una segunda ejecución sin insertar duplicados', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify([{
      number: 401,
      title: 'feat: evidencia prospectiva',
      html_url: 'https://github.com/kekoesports/proyectozack/pull/401',
      merged_at: '2026-09-01T18:00:00Z',
      merge_commit_sha: 'merge-sha',
      user: { login: 'kekoesports' },
      merged_by: { login: 'kekoesports' },
      head: { sha: 'head-sha' },
      base: { ref: 'master' },
    }]), { status: 200 }));
    insertReturning.mockResolvedValue([]);

    await expect(syncGithubIpEvidence()).resolves.toMatchObject({ discovered: 1, inserted: 0 });
  });
});
