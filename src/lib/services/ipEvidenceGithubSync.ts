import 'server-only';

import { inArray } from 'drizzle-orm';
import { z } from 'zod';

import { ipEvidenceEvents, ipProjects } from '@/db/schema';
import { db } from '@/lib/db';

const githubPullRequestSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  html_url: z.string().url(),
  merged_at: z.string().datetime().nullable(),
  merge_commit_sha: z.string().nullable(),
  user: z.object({ login: z.string() }).nullable(),
  merged_by: z.object({ login: z.string() }).nullable(),
  head: z.object({ sha: z.string() }),
  base: z.object({ ref: z.string() }),
});

const githubPullRequestsSchema = z.array(githubPullRequestSchema);

export type GithubRepository = {
  readonly owner: string;
  readonly repository: string;
};

export type IpEvidenceSyncResult = {
  readonly projectsChecked: number;
  readonly repositoriesSynced: number;
  readonly discovered: number;
  readonly inserted: number;
  readonly skipped: number;
  readonly errors: number;
};

export function parseGithubRepositoryRef(value: string | null): GithubRepository | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\.git$/i, '').replace(/\/$/, '');
  const match = normalized.match(
    /^(?:https?:\/\/github\.com\/|git@github\.com:)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i,
  );
  if (!match?.[1] || !match[2]) return null;
  return { owner: match[1], repository: match[2] };
}

async function fetchMergedPullRequests(repository: GithubRepository) {
  const endpoint = new URL(
    `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}/pulls`,
  );
  endpoint.searchParams.set('state', 'closed');
  endpoint.searchParams.set('sort', 'updated');
  endpoint.searchParams.set('direction', 'desc');
  endpoint.searchParams.set('per_page', '100');

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SocialPro-IP-Evidence/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`github-pr-sync-http-${response.status}`);
  return githubPullRequestsSchema.parse(await response.json()).flatMap((pullRequest) =>
    pullRequest.merged_at === null
      ? []
      : [{ ...pullRequest, merged_at: pullRequest.merged_at }],
  );
}

export async function syncGithubIpEvidence(): Promise<IpEvidenceSyncResult> {
  const projects = await db
    .select({
      id: ipProjects.id,
      repositoryRef: ipProjects.repositoryRef,
      evidenceTrackingStartedAt: ipProjects.evidenceTrackingStartedAt,
    })
    .from(ipProjects)
    .where(inArray(ipProjects.status, ['draft', 'active', 'paused']));

  let repositoriesSynced = 0;
  let discovered = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const project of projects) {
    const repository = parseGithubRepositoryRef(project.repositoryRef);
    if (!repository) {
      skipped += 1;
      continue;
    }

    try {
      const pulls = (await fetchMergedPullRequests(repository)).filter(
        (pullRequest) => new Date(pullRequest.merged_at) >= project.evidenceTrackingStartedAt,
      );
      repositoriesSynced += 1;
      discovered += pulls.length;
      if (pulls.length === 0) continue;

      const created = await db
        .insert(ipEvidenceEvents)
        .values(pulls.map((pullRequest) => ({
          projectId: project.id,
          externalId: `github:${repository.owner.toLowerCase()}/${repository.repository.toLowerCase()}:pr:${pullRequest.number}`,
          evidenceKind: 'github_pr' as const,
          title: pullRequest.title.slice(0, 500),
          evidenceRef: pullRequest.html_url.slice(0, 500),
          occurredAt: new Date(pullRequest.merged_at),
          actorName: pullRequest.user?.login.slice(0, 160) ?? null,
          sourceMetadata: {
            provider: 'github',
            pullRequestNumber: pullRequest.number,
            headSha: pullRequest.head.sha,
            mergeCommitSha: pullRequest.merge_commit_sha,
            baseBranch: pullRequest.base.ref,
            mergedBy: pullRequest.merged_by?.login ?? null,
          },
        })))
        .onConflictDoNothing({ target: ipEvidenceEvents.externalId })
        .returning({ id: ipEvidenceEvents.id });
      inserted += created.length;
    } catch (error) {
      errors += 1;
      console.error('[ip-evidence] GitHub sync failed', {
        projectId: project.id,
        repository: `${repository.owner}/${repository.repository}`,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
    }
  }

  return {
    projectsChecked: projects.length,
    repositoriesSynced,
    discovered,
    inserted,
    skipped,
    errors,
  };
}
