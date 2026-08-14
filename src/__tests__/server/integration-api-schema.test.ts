import {
  ActivityCreate,
  CampaignAutomationPatch,
  DraftCreate,
  DraftProviderPatch,
  FollowupPatch,
  PaginationQuery,
  TaskCreate,
  TaskPatch,
} from '@/lib/schemas/integrationApi';

describe('Integration API schemas', () => {
  it('coerces bounded pagination values', () => {
    expect(PaginationQuery.parse({ limit: '25', offset: '10' })).toEqual({
      limit: 25,
      offset: 10,
    });
    expect(PaginationQuery.safeParse({ limit: 101 }).success).toBe(false);
    expect(PaginationQuery.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('accepts a valid activity and rejects an invalid channel', () => {
    const valid = ActivityCreate.safeParse({
      entityType: 'brand',
      entityId: '42',
      activityType: 'email_received',
      channel: 'email',
      direction: 'inbound',
      summary: 'Respuesta recibida',
      occurredAt: '2026-08-14T08:00:00+02:00',
    });
    expect(valid.success).toBe(true);

    const invalid = ActivityCreate.safeParse({
      entityType: 'brand',
      entityId: '42',
      activityType: 'message',
      channel: 'carrier_pigeon',
      direction: 'inbound',
      summary: 'No permitido',
    });
    expect(invalid.success).toBe(false);
  });

  it('requires at least one field in patch requests', () => {
    expect(FollowupPatch.safeParse({}).success).toBe(false);
    expect(TaskPatch.safeParse({}).success).toBe(false);
    expect(FollowupPatch.safeParse({ status: 'hecho' }).success).toBe(true);
    expect(TaskPatch.safeParse({ priority: 'alta' }).success).toBe(true);
  });

  it('requires complete task relations and valid campaign asset URLs', () => {
    expect(TaskCreate.safeParse({
      title: 'Revisar entregable',
      ownerId: 'user-1',
      relatedType: 'campaign',
    }).success).toBe(false);
    expect(TaskCreate.safeParse({
      title: 'Revisar entregable',
      ownerId: 'user-1',
      relatedType: 'campaign',
      relatedId: 42,
      automationKey: 'deliverable-task:42:due',
    }).success).toBe(true);
    expect(CampaignAutomationPatch.safeParse({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/example',
      trackingSheetSpreadsheetId: 'example-sheet-id',
    }).success).toBe(true);
    expect(CampaignAutomationPatch.safeParse({ trackingSheetUrl: 'not-a-url' }).success).toBe(false);
  });

  it('defaults drafts to medium risk and limits provider transitions', () => {
    const draft = DraftCreate.parse({
      channel: 'email',
      purpose: 'followup',
      recipient: 'buyer@example.com',
      subject: 'Seguimiento',
      body: 'Borrador para revisión humana.',
      automationKey: 'followup:42:2026-08-14',
    });
    expect(draft.riskLevel).toBe('medium');

    expect(DraftProviderPatch.safeParse({
      status: 'sent',
      providerMessageId: 'gmail-123',
    }).success).toBe(true);
    expect(DraftProviderPatch.safeParse({ status: 'approved' }).success).toBe(false);
    expect(DraftProviderPatch.safeParse({ status: 'failed' }).success).toBe(false);
  });
});
