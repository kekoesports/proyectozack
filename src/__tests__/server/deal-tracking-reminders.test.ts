jest.mock('server-only', () => ({}));

const mockSendReminder = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/email/dealTrackingReminder', () => ({
  sendDealTrackingReminderEmail: mockSendReminder,
}));
jest.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

import {
  formatTrackingReminderForDiscord,
  processStaleDealTrackingReminders,
} from '@/lib/services/dealTrackingReminders';

function selectRows(rows: readonly unknown[]): void {
  const chain = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
}

function captureUpdate(): jest.Mock {
  const where = jest.fn().mockResolvedValue([]);
  const set = jest.fn().mockReturnValue({ where });
  mockUpdate.mockReturnValue({ set });
  return set;
}

const baseline = new Date('2026-08-10T08:00:00.000Z');
const now = new Date('2026-08-25T08:00:00.000Z');
const baseRow = {
  campaignId: 8,
  campaignName: 'Creador × Marca',
  brandName: 'Marca',
  talentName: 'Creador',
  trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/example/edit',
  createdAt: baseline,
  lastEvidenceAddedAt: baseline,
  reminderBaselineAt: null,
  reminderAttemptAt: null,
  reminderEmailSentAt: null,
  reminderDiscordNotifiedAt: null,
  reminderError: null,
  contactEmail: 'creador@example.com',
  managerEmail: null,
};

describe('recordatorios de seguimiento tras 7 días', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendReminder.mockResolvedValue('email_1');
  });

  it('envía el enlace una vez y deja el aviso interno pendiente de ACK', async () => {
    selectRows([baseRow]);
    const set = captureUpdate();

    const reminders = await processStaleDealTrackingReminders(now);

    expect(mockSendReminder).toHaveBeenCalledWith(expect.objectContaining({
      to: 'creador@example.com',
      trackingSheetUrl: baseRow.trackingSheetUrl,
      inactiveDays: 15,
    }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      trackingReminderBaselineAt: baseline,
      trackingReminderEmailSentAt: now,
      trackingReminderDiscordNotifiedAt: null,
    }));
    expect(reminders).toHaveLength(1);
    expect(formatTrackingReminderForDiscord(reminders[0]!)).toContain('RECORDATORIO DE SEGUIMIENTO ENVIADO');
  });

  it('reintenta Discord sin duplicar el email ya aceptado', async () => {
    selectRows([{
      ...baseRow,
      reminderBaselineAt: baseline,
      reminderAttemptAt: now,
      reminderEmailSentAt: now,
      reminderDiscordNotifiedAt: null,
    }]);
    captureUpdate();

    const reminders = await processStaleDealTrackingReminders(now);

    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.emailStatus).toBe('sent');
  });

  it('avisa a Discord si falta el email del creador', async () => {
    selectRows([{ ...baseRow, contactEmail: null }]);
    captureUpdate();

    const reminders = await processStaleDealTrackingReminders(now);

    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(reminders[0]?.emailStatus).toBe('missing-recipient');
    expect(formatTrackingReminderForDiscord(reminders[0]!)).toContain('no tiene email de contacto');
  });
});
