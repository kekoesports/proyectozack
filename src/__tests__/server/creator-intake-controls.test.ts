jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
const mockAuth = jest.fn<Promise<unknown>, unknown[]>();
jest.mock('@/lib/auth-guard', () => ({ requireAnyRole: (...args: unknown[]) => mockAuth(...args) }));
jest.mock('@/lib/env', () => ({ env: { CREATOR_INTAKE_ENABLED: true, CREATOR_INTAKE_WHATSAPP_CHATS: '34999000002', CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND: false } }));
const mockDetail = jest.fn();
const mockControl = jest.fn();
jest.mock('@/lib/queries/creatorIntake', () => ({ creatorIntake: { detail: (...args: unknown[]) => mockDetail(...args),
  control: (...args: unknown[]) => mockControl(...args) } }));
import { controlIntakeAction } from '@/app/admin/(dashboard)/captacion/actions';
import { env } from '@/lib/env';

const form = () => {
  const data = new FormData();
  data.set('id', '11111111-1111-4111-8111-111111111111'); data.set('version', '1'); data.set('action', 'resume');
  return data;
};
beforeEach(() => { jest.clearAllMocks(); jest.replaceProperty(env, 'CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND', false); });
it('requires actual application authorization before reading or changing a contact', async () => {
  mockAuth.mockRejectedValueOnce(new Error('unauthorized'));
  await expect(controlIntakeAction({ ok: true }, form())).rejects.toThrow('unauthorized');
  expect(mockDetail).not.toHaveBeenCalled(); expect(mockControl).not.toHaveBeenCalled();
});
it('does not imply that resuming can expand the pilot response audience', async () => {
  // Isolated guard fixture; production action still requires the real authenticated session.
  mockAuth.mockResolvedValueOnce({ user: { id: 'TEST-admin' } });
  mockDetail.mockResolvedValueOnce({ conversation: { channel: 'whatsapp', accountId: 'waha:34999000001', chatId: '34999000003' } });
  const result = await controlIntakeAction({ ok: true }, form());
  expect(result.ok).toBe(false); expect(result.error).toMatch(/fuera del piloto/);
  expect(mockControl).not.toHaveBeenCalled();
});
it('allows the authenticated owner to resume a new contact when inbound replies are enabled', async () => {
  jest.replaceProperty(env, 'CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND', true);
  mockAuth.mockResolvedValueOnce({ user: { id: 'TEST-admin' } });
  mockDetail.mockResolvedValueOnce({ conversation: { channel: 'whatsapp', accountId: 'waha:34999000001', chatId: '34999000003' } });
  mockControl.mockResolvedValueOnce({ ok: true });
  expect(await controlIntakeAction({ ok: true }, form())).toEqual({ ok: true });
  expect(mockControl).toHaveBeenCalledTimes(1);
});
