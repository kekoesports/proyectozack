import 'server-only';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { githubCommitsSchema } from '@/lib/schemas/github-commit-evidence';
import { ipEvidenceEvents, ipProjects } from '@/db/schema';
import { db } from '@/lib/db';
import { parseGithubRepositoryRef } from './ipEvidenceGithubSync';

/** Default-branch commits are evidence, never a proxy for hours or R&D eligibility. */
export async function syncGithubCommitEvidence() {
  const projects = await db.select().from(ipProjects)
    .where(inArray(ipProjects.status, ['draft', 'active', 'paused']));
  let discovered = 0; let inserted = 0; let errors = 0;
  for (const project of projects) {
    const repository = parseGithubRepositoryRef(project.repositoryRef);
    if (!repository) continue;
    try {
      const records: z.infer<typeof githubCommitsSchema> = [];
      let complete = false;
      for (let page = 1; page <= 20; page += 1) {
        const endpoint = new URL(`https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}/commits`);
        endpoint.search = new URLSearchParams({ since: project.evidenceTrackingStartedAt.toISOString(), per_page: '100', page: String(page) }).toString();
        const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json',
          'User-Agent': 'SocialPro-IP-Evidence/1.0', 'X-GitHub-Api-Version': '2022-11-28' },
          signal: AbortSignal.timeout(15_000), cache: 'no-store' });
        if (!response.ok) throw new Error(`github-commit-sync-http-${response.status}`);
        const parsed = githubCommitsSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error('github-commit-sync-invalid-response');
        records.push(...parsed.data);
        if (parsed.data.length < 100) { complete = true; break; }
      }
      if (!complete) throw new Error('github-commit-sync-pagination-limit');
      const current = records.filter((record) => new Date(record.commit.committer.date) >= project.evidenceTrackingStartedAt);
      discovered += current.length;
      if (!current.length) continue;
      const saved = await db.insert(ipEvidenceEvents).values(current.map((record) => ({
        projectId: project.id, externalId: `github:${repository.owner.toLowerCase()}/${repository.repository.toLowerCase()}:commit:${record.sha}`,
        evidenceKind: 'git_commit' as const, title: (record.commit.message.split('\n')[0] ?? record.commit.message).slice(0, 500),
        evidenceRef: record.html_url.slice(0, 500), occurredAt: new Date(record.commit.committer.date),
        sourceMetadata: { provider: 'github', sha: record.sha, branchScope: 'repository-default',
          timestampBasis: 'git_committer_date', hoursNotInferred: true, deploymentNotProven: true },
      }))).onConflictDoNothing({ target: ipEvidenceEvents.externalId }).returning({ id: ipEvidenceEvents.id });
      inserted += saved.length;
    } catch (error: unknown) {
      errors += 1;
      console.error('[ip-evidence] Commit sync failed', { projectId: project.id,
        error: error instanceof Error ? error.message : 'unknown-error' });
    }
  }
  return { projectsChecked: projects.length, discovered, inserted, errors };
}
