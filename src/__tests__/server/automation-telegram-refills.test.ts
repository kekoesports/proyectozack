import {
  buildTelegramRefillDescription,
  buildTelegramRefillTitle,
  telegramRefillExternalId,
  todayMadridIso,
} from '@/lib/automation/telegramRefills';
import {
  AutomationTelegramRefillCreate,
  AutomationTelegramRefillTaskId,
} from '@/lib/schemas/automationTelegramRefill';

const validInput = {
  updateId: 123456,
  chatId: '-1001234567890',
  chatTitle: 'KeyDrop Creators',
  requesterUsername: 'socialpro_admin',
  brand: 'KeyDrop',
  creator: 'Huasopeek',
  amount: '25 cajas',
  note: 'Reposición para la campaña de agosto',
};

describe('AutomationTelegramRefillCreate', () => {
  it('accepts a valid group refill request and trims its fields', () => {
    const parsed = AutomationTelegramRefillCreate.parse({
      ...validInput,
      brand: '  KeyDrop  ',
    });

    expect(parsed.brand).toBe('KeyDrop');
    expect(parsed.chatId).toBe('-1001234567890');
  });

  it('rejects malformed chat ids and missing creators', () => {
    expect(
      AutomationTelegramRefillCreate.safeParse({
        ...validInput,
        chatId: 'group-one',
        creator: '',
      }).success,
    ).toBe(false);
  });

  it('validates positive task ids from query strings', () => {
    expect(AutomationTelegramRefillTaskId.parse('42')).toBe(42);
    expect(AutomationTelegramRefillTaskId.safeParse('0').success).toBe(false);
  });
});

describe('Telegram refill task formatting', () => {
  it('builds a traceable CRM task without exposing bot credentials', () => {
    const title = buildTelegramRefillTitle(validInput);
    const description = buildTelegramRefillDescription(validInput);

    expect(title).toBe('[REFILL] KeyDrop × Huasopeek — 25 cajas');
    expect(description).toContain('Solicitante: @socialpro_admin');
    expect(description).toContain('[telegram-update:telegram:123456]');
    expect(description.toLowerCase()).not.toContain('token');
    expect(telegramRefillExternalId(validInput.updateId)).toBe('telegram:123456');
  });

  it('uses Madrid civil time for the CRM due date', () => {
    expect(todayMadridIso(new Date('2026-08-23T22:30:00.000Z'))).toBe('2026-08-24');
  });
});
