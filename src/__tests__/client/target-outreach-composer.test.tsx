import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetHistory = jest.fn();
const mockSend = jest.fn();

jest.mock('@/app/admin/(dashboard)/targets/actions', () => ({
  getTargetOutreachAction: (...args: unknown[]) => mockGetHistory(...args),
  sendTargetOutreachAction: (...args: unknown[]) => mockSend(...args),
}));

import { TargetOutreachComposer } from '@/features/admin/targets/components/TargetOutreachComposer';

describe('TargetOutreachComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory.mockResolvedValue({ ok: true, thread: null });
    mockSend.mockResolvedValue({ ok: true, replyTracking: false });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => '11111111-1111-4111-8111-111111111111',
    });
  });

  it('sends only after the operator clicks and explains the safe fallback', async () => {
    render(<TargetOutreachComposer
      target={{ id: 42, name: 'Creator TEST', email: 'creator@example.com' }}
      onClose={jest.fn()}
    />);
    expect(mockSend).not.toHaveBeenCalled();
    const sendButton = await screen.findByRole('button', { name: 'Enviar y registrar' });
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Propuesta sintética' } });
    fireEvent.click(sendButton);

    await waitFor(() => expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: 42,
      body: 'Propuesta sintética',
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
    })));
    expect(await screen.findByText(/respuestas llegarán al buzón operativo/i)).toBeInTheDocument();
  });
});
