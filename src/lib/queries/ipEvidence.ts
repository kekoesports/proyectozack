import 'server-only';

import { createHash } from 'node:crypto';

import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { ipProjects, ipWorkLogs } from '@/db/schema';
import { db } from '@/lib/db';
import {
  calculateProjectReadiness,
  provisionalAssessmentForCategory,
  recordModeForWorkDate,
  type IpActivityCategory,
} from '@/lib/ip-evidence/policy';

export const IP_LEGAL_ENTITIES = [
  'elevatex_agency_pa_sl',
  'playmaker_media_llc',
  'founder_personal',
] as const;

export const IP_EVIDENCE_KINDS = [
  'git_commit',
  'github_pr',
  'task',
  'document',
  'test_run',
  'deployment',
  'other',
] as const;

export type IpLegalEntity = (typeof IP_LEGAL_ENTITIES)[number];
export type IpEvidenceKind = (typeof IP_EVIDENCE_KINDS)[number];

export type CreateIpProjectInput = {
  readonly code: string;
  readonly name: string;
  readonly assetName: string;
  readonly ownerEntity: IpLegalEntity;
  readonly payingEntity: IpLegalEntity;
  readonly futureCyprusCandidate: boolean;
  readonly repositoryRef: string | undefined;
  readonly technicalUncertainty: string | undefined;
  readonly expectedOutcome: string | undefined;
  readonly startedOn: string;
  readonly createdByUserId: string;
};

export type CreateIpWorkLogInput = {
  readonly projectId: number;
  readonly contributorName: string;
  readonly contributorUserId?: string;
  readonly workDate: string;
  readonly minutes: number;
  readonly activityCategory: IpActivityCategory;
  readonly description: string;
  readonly evidenceKind: IpEvidenceKind;
  readonly evidenceRef: string;
  readonly recordedByUserId: string;
};

export async function createIpProject(input: CreateIpProjectInput): Promise<number> {
  const [created] = await db
    .insert(ipProjects)
    .values({
      code: input.code,
      name: input.name,
      assetName: input.assetName,
      ownerEntity: input.ownerEntity,
      payingEntity: input.payingEntity,
      futureCyprusCandidate: input.futureCyprusCandidate,
      repositoryRef: input.repositoryRef || null,
      technicalUncertainty: input.technicalUncertainty || null,
      expectedOutcome: input.expectedOutcome || null,
      startedOn: input.startedOn,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: ipProjects.id });

  if (!created) throw new Error('ip-project-not-created');
  return created.id;
}

export async function createIpWorkLog(input: CreateIpWorkLogInput): Promise<number> {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({
        id: ipProjects.id,
        ownerEntity: ipProjects.ownerEntity,
        payingEntity: ipProjects.payingEntity,
      })
      .from(ipProjects)
      .where(
        and(
          eq(ipProjects.id, input.projectId),
          inArray(ipProjects.status, ['draft', 'active', 'paused']),
        ),
      )
      .limit(1);

    if (!project) throw new Error('ip-project-not-available');

    const createdAt = new Date();
    const provisionalAssessment = provisionalAssessmentForCategory(input.activityCategory);
    const recordMode = recordModeForWorkDate(input.workDate, createdAt);
    const canonicalEvidence = JSON.stringify({
      projectId: project.id,
      contributorName: input.contributorName,
      contributorUserId: input.contributorUserId ?? null,
      workDate: input.workDate,
      minutes: input.minutes,
      activityCategory: input.activityCategory,
      provisionalAssessment,
      description: input.description,
      evidenceKind: input.evidenceKind,
      evidenceRef: input.evidenceRef,
      recordMode,
      ownerEntitySnapshot: project.ownerEntity,
      payingEntitySnapshot: project.payingEntity,
      recordedByUserId: input.recordedByUserId,
      createdAt: createdAt.toISOString(),
    });
    const integrityHash = createHash('sha256').update(canonicalEvidence).digest('hex');

    const [created] = await tx
      .insert(ipWorkLogs)
      .values({
        projectId: project.id,
        contributorName: input.contributorName,
        contributorUserId: input.contributorUserId || null,
        workDate: input.workDate,
        minutes: input.minutes,
        activityCategory: input.activityCategory,
        provisionalAssessment,
        description: input.description,
        evidenceKind: input.evidenceKind,
        evidenceRef: input.evidenceRef,
        recordMode,
        ownerEntitySnapshot: project.ownerEntity,
        payingEntitySnapshot: project.payingEntity,
        integrityHash,
        recordedByUserId: input.recordedByUserId,
        createdAt,
      })
      .returning({ id: ipWorkLogs.id });

    if (!created) throw new Error('ip-work-log-not-created');
    return created.id;
  });
}

function firstDayOfUtcMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function getIpReadinessDashboard() {
  const now = new Date();
  const monthStart = firstDayOfUtcMonth(now);

  const projects = await db
    .select()
    .from(ipProjects)
    .where(inArray(ipProjects.status, ['draft', 'active', 'paused', 'completed']))
    .orderBy(desc(ipProjects.startedOn), desc(ipProjects.id));

  const projectStats = await db
    .select({
      projectId: ipWorkLogs.projectId,
      logCount: sql<number>`count(*)::int`,
      evidenceCount: sql<number>`count(*) filter (where ${ipWorkLogs.evidenceRef} <> '')::int`,
      totalMinutes: sql<number>`coalesce(sum(${ipWorkLogs.minutes}), 0)::int`,
      candidateMinutes: sql<number>`coalesce(sum(${ipWorkLogs.minutes}) filter (where ${ipWorkLogs.provisionalAssessment} in ('rd_candidate', 'it_candidate')), 0)::int`,
      contemporaneousCount: sql<number>`count(*) filter (where ${ipWorkLogs.recordMode} = 'contemporaneous')::int`,
    })
    .from(ipWorkLogs)
    .groupBy(ipWorkLogs.projectId);

  const [monthStats] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${ipWorkLogs.minutes}), 0)::int`,
      candidateMinutes: sql<number>`coalesce(sum(${ipWorkLogs.minutes}) filter (where ${ipWorkLogs.provisionalAssessment} in ('rd_candidate', 'it_candidate')), 0)::int`,
      logCount: sql<number>`count(*)::int`,
      contemporaneousCount: sql<number>`count(*) filter (where ${ipWorkLogs.recordMode} = 'contemporaneous')::int`,
    })
    .from(ipWorkLogs)
    .where(gte(ipWorkLogs.workDate, monthStart));

  const recentLogs = await db
    .select({
      id: ipWorkLogs.id,
      projectCode: ipProjects.code,
      projectName: ipProjects.name,
      contributorName: ipWorkLogs.contributorName,
      workDate: ipWorkLogs.workDate,
      minutes: ipWorkLogs.minutes,
      activityCategory: ipWorkLogs.activityCategory,
      provisionalAssessment: ipWorkLogs.provisionalAssessment,
      description: ipWorkLogs.description,
      evidenceKind: ipWorkLogs.evidenceKind,
      evidenceRef: ipWorkLogs.evidenceRef,
      recordMode: ipWorkLogs.recordMode,
      ownerEntitySnapshot: ipWorkLogs.ownerEntitySnapshot,
      payingEntitySnapshot: ipWorkLogs.payingEntitySnapshot,
      createdAt: ipWorkLogs.createdAt,
    })
    .from(ipWorkLogs)
    .innerJoin(ipProjects, eq(ipWorkLogs.projectId, ipProjects.id))
    .orderBy(desc(ipWorkLogs.createdAt))
    .limit(30);

  const statsByProject = new Map(projectStats.map((row) => [row.projectId, row]));
  const projectsWithReadiness = projects.map((project) => {
    const stats = statsByProject.get(project.id) ?? {
      logCount: 0,
      evidenceCount: 0,
      totalMinutes: 0,
      candidateMinutes: 0,
      contemporaneousCount: 0,
    };
    return {
      ...project,
      ...stats,
      readiness: calculateProjectReadiness({
        hasExpectedOutcome: Boolean(project.expectedOutcome?.trim()),
        hasTechnicalUncertainty: Boolean(project.technicalUncertainty?.trim()),
        logCount: stats.logCount,
        evidenceCount: stats.evidenceCount,
        candidateMinutes: stats.candidateMinutes,
        contemporaneousCount: stats.contemporaneousCount,
        ownerEqualsPayer: project.ownerEntity === project.payingEntity,
      }),
    };
  });

  const month = monthStats ?? {
    minutes: 0,
    candidateMinutes: 0,
    logCount: 0,
    contemporaneousCount: 0,
  };

  return {
    projects: projectsWithReadiness,
    recentLogs,
    summary: {
      activeProjects: projects.filter((project) => project.status === 'active').length,
      monthMinutes: month.minutes,
      candidateMinutes: month.candidateMinutes,
      contemporaneousPercentage:
        month.logCount === 0 ? 0 : Math.round((month.contemporaneousCount / month.logCount) * 100),
    },
  };
}

/** Vista agregada y sin descripciones/evidencias sensibles para Zack. */
export async function getIpReadinessAssistantSummary() {
  const dashboard = await getIpReadinessDashboard();
  return {
    notice:
      'Indicadores documentales provisionales. No constituyen aprobación fiscal ni atribuyen costes a una futura entidad chipriota.',
    summary: dashboard.summary,
    projects: dashboard.projects.map((project) => ({
      code: project.code,
      name: project.name,
      assetName: project.assetName,
      status: project.status,
      ownerEntity: project.ownerEntity,
      payingEntity: project.payingEntity,
      futureCyprusCandidate: project.futureCyprusCandidate,
      totalHours: Math.round((project.totalMinutes / 60) * 10) / 10,
      candidateHours: Math.round((project.candidateMinutes / 60) * 10) / 10,
      readinessScore: project.readiness.score,
      documentaryGaps: project.readiness.gaps,
    })),
  };
}
