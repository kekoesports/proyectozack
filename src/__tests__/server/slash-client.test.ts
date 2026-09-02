import { SlashClient, slashCardSchema, slashTransactionSchema } from '@/lib/integrations/slash/client';

describe('Slash read-only client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('descarta PAN, CVV y datos bancarios no permitidos al validar respuestas', () => {
    const card = slashCardSchema.parse({
      id: 'card-1',
      accountId: 'account-1',
      last4: '9715',
      name: 'PLAYMAKER',
      status: 'active',
      isPhysical: false,
      userData: null,
      pan: '4111111111111111',
      cvv: '123',
    });
    const transaction = slashTransactionSchema.parse({
      id: 'transaction-1',
      date: '2026-09-02T09:00:00.000Z',
      description: 'Software',
      amountCents: -2_500,
      status: 'posted',
      detailedStatus: 'settled',
      accountId: 'account-1',
      sepaInfo: { iban: 'ES0000000000000000000000' },
    });

    expect(card).not.toHaveProperty('pan');
    expect(card).not.toHaveProperty('cvv');
    expect(card.userData).toBeNull();
    expect(transaction).not.toHaveProperty('sepaInfo');
  });

  it('solo realiza GET y fuerza el filtro de PLAYMAKER', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [],
      metadata: { nextCursor: null, count: 0 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new SlashClient({ apiKey: 'secret', legalEntityId: 'playmaker-entity' });

    await client.listTransactions({ fromDate: new Date(0) });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('filter%3AlegalEntityId=playmaker-entity');
    expect(String(url)).toContain('filter%3Afrom_date=0');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('x-legal-entity')).toBe('playmaker-entity');
  });
});
