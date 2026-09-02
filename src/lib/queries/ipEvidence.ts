import 'server-only';

import { createHash } from 'node:crypto';

import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

import { ipDocuments, ipEvidenceEvents, ipProjects, ipWorkLogs } from '@/db/schema';
import { db } from '@/lib/db';
import {
  IP_DATA_ROOM_REQUIREMENTS,
  IP_DOCUMENT_CATEGORIES,
  IP_DOCUMENT_STATUSES,
  IP_DOCUMENT_STORAGE_LOCATIONS,
  isIpDocumentReady,
  type IpDocumentCategory,
  type IpDocumentStatus,
  type IpDocumentStorageLocation,
} from '@/lib/ip-evidence/data-room';
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

export {
  IP_DATA_ROOM_REQUIREMENTS,
  IP_DOCUMENT_CATEGORIES,
  IP_DOCUMENT_STATUSES,
  IP_DOCUMENT_STORAGE_LOCATIONS,
};

export type CreateIpProjectInput = {
  readonly code: string;
  readonly name: string;
  readonly assetName: string;
  readonly ownerEntity: IpLegalEntity | null;
  readonly payingEntity: IpLegalEntity | null;
  readonly futureCyprusCandidate: boolean;
  readonly repositoryRef: string | undefined;
  readonly technicalUncertainty: string | undefined;
  readonly expectedOutcome: string | undefined;
  readonly startedOn: string;
  readonly createdByUserId: string;
};

export type CreateIpWorkLogInput = {
  readonly projectId: number;
  readonly evidenceEventId?: number | undefined;
  readonly contributorName: string;
  readonly contributorUserId?: string;
  readonly workDate: string;
  readonly minutes: number;
  readonly activityCategory: IpActivityCategory;
  readonly description: string;
  readonly evidenceKind?: IpEvidenceKind | undefined;
  readonly evidenceRef?: string | undefined;
  readonly recordedByUserId: string;
};

export type CreateIpDocumentInput = {
  readonly projectId: number;
  readonly requirementCode: string;
  readonly title: string;
  readonly category: IpDocumentCategory;
  readonly status: IpDocumentStatus;
  readonly legalEntity: IpLegalEntity | null;
  readonly storageLocation: IpDocumentStorageLocation;
  readonly documentRef: string;
  readonly versionLabel: string | undefined;
  readonly contentSha256: string | undefined;
  readonly effectiveOn: string | undefined;
  readonly expiresOn: string | undefined;
  readonly notes: string | undefined;
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

    let evidenceKind = input.evidenceKind;
    let evidenceRef = input.evidenceRef;
    if (input.evidenceEventId) {
      const [evidenceEvent] = await tx
        .select({
          id: ipEvidenceEvents.id,
          evidenceKind: ipEvidenceEvents.evidenceKind,
          evidenceRef: ipEvidenceEvents.evidenceRef,
        })
        .from(ipEvidenceEvents)
        .where(
          and(
            eq(ipEvidenceEvents.id, input.evidenceEventId),
            eq(ipEvidenceEvents.projectId, project.id),
          ),
        )
        .limit(1);
      if (!evidenceEvent) throw new Error('ip-evidence-event-not-available');
      evidenceKind = evidenceEvent.evidenceKind;
      evidenceRef = evidenceEvent.evidenceRef;
    }
    if (!evidenceKind || !evidenceRef) throw new Error('ip-evidence-reference-required');

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
      evidenceEventId: input.evidenceEventId ?? null,
      evidenceKind,
      evidenceRef,
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
        evidenceEventId: input.evidenceEventId || null,
        contributorName: input.contributorName,
        contributorUserId: input.contributorUserId || null,
        workDate: input.workDate,
        minutes: input.minutes,
        activityCategory: input.activityCategory,
        provisionalAssessment,
        description: input.description,
        evidenceKind,
        evidenceRef,
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

export async function createIpDocument(input: CreateIpDocumentInput): Promise<number> {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: ipProjects.id })
      .from(ipProjects)
      .where(
        and(
          eq(ipProjects.id, input.projectId),
          inArray(ipProjects.status, ['draft', 'active', 'paused', 'completed']),
        ),
      )
      .limit(1);

    if (!project) throw new Error('ip-project-not-available');

    const createdAt = new Date();
    const canonicalDocument = JSON.stringify({
      projectId: project.id,
      requirementCode: input.requirementCode,
      title: input.title,
      category: input.category,
      status: input.status,
      legalEntity: input.legalEntity,
      storageLocation: input.storageLocation,
      documentRef: input.documentRef,
      versionLabel: input.versionLabel ?? null,
      contentSha256: input.contentSha256 ?? null,
      effectiveOn: input.effectiveOn ?? null,
      expiresOn: input.expiresOn ?? null,
      notes: input.notes ?? null,
      recordedByUserId: input.recordedByUserId,
      createdAt: createdAt.toISOString(),
    });
    const integrityHash = createHash('sha256').update(canonicalDocument).digest('hex');

    const [created] = await tx
      .insert(ipDocuments)
      .values({
        projectId: project.id,
        requirementCode: input.requirementCode,
        title: input.title,
        category: input.category,
        status: input.status,
        legalEntity: input.legalEntity,
        storageLocation: input.storageLocation,
        documentRef: input.documentRef,
        versionLabel: input.versionLabel || null,
        contentSha256: input.contentSha256 || null,
        effectiveOn: input.effectiveOn || null,
        expiresOn: input.expiresOn || null,
        notes: input.notes || null,
        integrityHash,
        recordedByUserId: input.recordedByUserId,
        createdAt,
      })
      .returning({ id: ipDocuments.id });

    if (!created) throw new Error('ip-document-not-created');
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
      evidenceEventId: ipWorkLogs.evidenceEventId,
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

  const pendingEvidence = await db
    .select({
      id: ipEvidenceEvents.id,
      projectId: ipEvidenceEvents.projectId,
      projectCode: ipProjects.code,
      projectName: ipProjects.name,
      evidenceKind: ipEvidenceEvents.evidenceKind,
      title: ipEvidenceEvents.title,
      evidenceRef: ipEvidenceEvents.evidenceRef,
      occurredAt: ipEvidenceEvents.occurredAt,
      actorName: ipEvidenceEvents.actorName,
      createdAt: ipEvidenceEvents.createdAt,
    })
    .from(ipEvidenceEvents)
    .innerJoin(ipProjects, eq(ipEvidenceEvents.projectId, ipProjects.id))
    .leftJoin(ipWorkLogs, eq(ipWorkLogs.evidenceEventId, ipEvidenceEvents.id))
    .where(isNull(ipWorkLogs.id))
    .orderBy(desc(ipEvidenceEvents.occurredAt))
    .limit(50);

  const [pendingEvidenceStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ipEvidenceEvents)
    .leftJoin(ipWorkLogs, eq(ipWorkLogs.evidenceEventId, ipEvidenceEvents.id))
    .where(isNull(ipWorkLogs.id));

  const documents = await db
    .select({
      id: ipDocuments.id,
      projectId: ipDocuments.projectId,
      projectCode: ipProjects.code,
      requirementCode: ipDocuments.requirementCode,
      title: ipDocuments.title,
      category: ipDocuments.category,
      status: ipDocuments.status,
      legalEntity: ipDocuments.legalEntity,
      storageLocation: ipDocuments.storageLocation,
      documentRef: ipDocuments.documentRef,
      versionLabel: ipDocuments.versionLabel,
      contentSha256: ipDocuments.contentSha256,
      effectiveOn: ipDocuments.effectiveOn,
      expiresOn: ipDocuments.expiresOn,
      notes: ipDocuments.notes,
      integrityHash: ipDocuments.integrityHash,
      createdAt: ipDocuments.createdAt,
    })
    .from(ipDocuments)
    .innerJoin(ipProjects, eq(ipDocuments.projectId, ipProjects.id))
    .orderBy(desc(ipDocuments.createdAt), desc(ipDocuments.id));

  const latestDocumentByRequirement = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    if (!latestDocumentByRequirement.has(document.requirementCode)) {
      latestDocumentByRequirement.set(document.requirementCode, document);
    }
  }
  const dataRoomRequirements = IP_DATA_ROOM_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    currentDocument: latestDocumentByRequirement.get(requirement.code) ?? null,
  }));
  const readyRequirementCount = dataRoomRequirements.filter(
    (requirement) => requirement.currentDocument && isIpDocumentReady(requirement.currentDocument.status),
  ).length;
  const advisorApprovedDocumentCount = documents.filter(
    (document) => document.status === 'advisor_approved',
  ).length;

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
        ownerEqualsPayer:
          project.ownerEntity !== null && project.ownerEntity === project.payingEntity,
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
    pendingEvidence,
    documents: documents.slice(0, 50),
    dataRoomRequirements,
    summary: {
      activeProjects: projects.filter((project) => project.status === 'active').length,
      monthMinutes: month.minutes,
      candidateMinutes: month.candidateMinutes,
      contemporaneousPercentage:
        month.logCount === 0 ? 0 : Math.round((month.contemporaneousCount / month.logCount) * 100),
      pendingEvidence: pendingEvidenceStats?.count ?? 0,
      documentsRegistered: documents.length,
      readyRequirements: readyRequirementCount,
      totalRequirements: IP_DATA_ROOM_REQUIREMENTS.length,
      advisorApprovedDocuments: advisorApprovedDocumentCount,
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
