const mockRows = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockTx = {
  select: () => ({ from: () => ({ where: () => ({ for: mockRows }) }) }),
  update: mockUpdate,
  insert: mockInsert,
};
jest.mock('@/lib/db', () => ({ db: { transaction: (run: (tx: typeof mockTx) => Promise<unknown>) => run(mockTx) } }));
jest.mock('@/lib/env', () => ({ env: {
  DISCORD_CREATOR_DISCOVERY_GUILD_ID: '1522153792592806018',
  DISCORD_CREATOR_DISCOVERY_CHANNEL_ID: '1533123540360892599',
} }));
import { acknowledgeCreatorDigest } from '@/lib/queries/creatorDigest';

const receipt = { messageId: '1545942105652985918', channelId: '1533123515023360114' };
const sent = { guildId: '1522153792592806018', channelId: receipt.channelId,
  status: 'sent', messageId: receipt.messageId, attempts: 1 };

beforeEach(() => { jest.clearAllMocks(); mockRows.mockResolvedValue([sent]); });
afterEach(() => { expect(mockUpdate).not.toHaveBeenCalled(); expect(mockInsert).not.toHaveBeenCalled(); });

it('accepts an identical historical receipt after changing the configured channel without writing', async () => {
  await expect(acknowledgeCreatorDigest(2, receipt)).resolves.toBe('duplicate');
});
it.each([
  { ...receipt, channelId: '1533123540360892599' },
  { ...receipt, messageId: '1545942105652985919' },
])('rejects changing a previously accepted receipt', async value => {
  await expect(acknowledgeCreatorDigest(2, value)).resolves.toBe('conflict');
});
it('does not acknowledge an unsent old-destination item under the new routing', async () => {
  mockRows.mockResolvedValue([{ ...sent, status: 'pending', messageId: null }]);
  await expect(acknowledgeCreatorDigest(2, receipt)).resolves.toBe('conflict');
});
it('still rejects a receipt from another guild', async () => {
  mockRows.mockResolvedValue([{ ...sent, guildId: '1522153792592806019' }]);
  await expect(acknowledgeCreatorDigest(2, receipt)).resolves.toBe('conflict');
});
it('rejects malformed acknowledgements before reading the database', async () => {
  await expect(acknowledgeCreatorDigest(2, { ...receipt, extra: true })).resolves.toBe('conflict');
  expect(mockRows).not.toHaveBeenCalled();
});
