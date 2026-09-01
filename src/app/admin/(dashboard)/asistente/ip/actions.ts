'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  IP_EVIDENCE_KINDS,
  IP_LEGAL_ENTITIES,
  createIpProject,
  createIpWorkLog,
} from '@/lib/queries/ipEvidence';
import { IP_ACTIVITY_CATEGORIES } from '@/lib/ip-evidence/policy';
import { logRedacted } from '@/lib/log';
import { requirePermission } from '@/lib/permissions';

const TODAY = () => new Date().toISOString().slice(0, 10);
const REVALIDATE_PATH = '/admin/asistente/ip';

const projectSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9][A-Z0-9_-]*$/),
  name: z.string().trim().min(3).max(180),
  assetName: z.string().trim().min(3).max(180),
  ownerEntity: z.union([z.enum(IP_LEGAL_ENTITIES), z.literal('')])
    .transform((value) => value || null),
  payingEntity: z.union([z.enum(IP_LEGAL_ENTITIES), z.literal('')])
    .transform((value) => value || null),
  repositoryRef: z.string().trim().max(500).optional(),
  technicalUncertainty: z.string().trim().max(4_000).optional(),
  expectedOutcome: z.string().trim().max(4_000).optional(),
  startedOn: z.string().date(),
  futureCyprusCandidate: z.boolean(),
});

const workLogSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  contributorName: z.string().trim().min(2).max(160),
  workDate: z.string().date(),
  minutes: z.coerce.number().int().min(1).max(1_440),
  activityCategory: z.enum(IP_ACTIVITY_CATEGORIES),
  description: z.string().trim().min(10).max(4_000),
  evidenceKind: z.enum(IP_EVIDENCE_KINDS),
  evidenceRef: z.string().trim().min(3).max(500),
});

function optionalFormValue(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? '').trim();
  return value || undefined;
}

export async function createIpProjectAction(formData: FormData): Promise<never> {
  const session = await requirePermission('ip_evidence', 'write');
  const parsed = projectSchema.safeParse({
    code: String(formData.get('code') ?? '').trim().toUpperCase(),
    name: String(formData.get('name') ?? ''),
    assetName: String(formData.get('assetName') ?? ''),
    ownerEntity: String(formData.get('ownerEntity') ?? ''),
    payingEntity: String(formData.get('payingEntity') ?? ''),
    repositoryRef: optionalFormValue(formData, 'repositoryRef'),
    technicalUncertainty: optionalFormValue(formData, 'technicalUncertainty'),
    expectedOutcome: optionalFormValue(formData, 'expectedOutcome'),
    startedOn: String(formData.get('startedOn') ?? ''),
    futureCyprusCandidate: formData.get('futureCyprusCandidate') === 'on',
  });

  if (!parsed.success || parsed.data.startedOn > TODAY()) {
    redirect(`${REVALIDATE_PATH}?error=project-validation`);
  }

  let errorCode: string | null = null;
  try {
    await createIpProject({
      ...parsed.data,
      repositoryRef: parsed.data.repositoryRef,
      technicalUncertainty: parsed.data.technicalUncertainty,
      expectedOutcome: parsed.data.expectedOutcome,
      createdByUserId: session.user.id,
    });
  } catch (error) {
    logRedacted('error', '[ip-evidence] No se pudo crear el proyecto:', error);
    errorCode = error instanceof Error && error.message.includes('unique')
      ? 'project-code-exists'
      : 'project-create';
  }

  if (errorCode) redirect(`${REVALIDATE_PATH}?error=${errorCode}`);
  revalidatePath(REVALIDATE_PATH);
  redirect(`${REVALIDATE_PATH}?created=project`);
}

export async function createIpWorkLogAction(formData: FormData): Promise<never> {
  const session = await requirePermission('ip_evidence', 'write');
  const parsed = workLogSchema.safeParse({
    projectId: formData.get('projectId'),
    contributorName: String(formData.get('contributorName') ?? ''),
    workDate: String(formData.get('workDate') ?? ''),
    minutes: formData.get('minutes'),
    activityCategory: String(formData.get('activityCategory') ?? ''),
    description: String(formData.get('description') ?? ''),
    evidenceKind: String(formData.get('evidenceKind') ?? ''),
    evidenceRef: String(formData.get('evidenceRef') ?? ''),
  });

  if (!parsed.success || parsed.data.workDate > TODAY()) {
    redirect(`${REVALIDATE_PATH}?error=log-validation`);
  }

  let errorCode: string | null = null;
  try {
    await createIpWorkLog({
      ...parsed.data,
      contributorUserId: session.user.id,
      recordedByUserId: session.user.id,
    });
  } catch (error) {
    logRedacted('error', '[ip-evidence] No se pudo registrar el trabajo:', error);
    errorCode = 'log-create';
  }

  if (errorCode) redirect(`${REVALIDATE_PATH}?error=${errorCode}`);
  revalidatePath(REVALIDATE_PATH);
  redirect(`${REVALIDATE_PATH}?created=log`);
}
