jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'https://socialpro.test',
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({
    get: (k: string) => (k === 'x-forwarded-for' ? '1.2.3.4' : null),
  }),
}));

const mockGetSignerByToken = jest.fn();
const mockRecordSignature = jest.fn();
const mockGetContractById = jest.fn();
const mockUpdateContract = jest.fn();

jest.mock('@/lib/queries/contracts', () => ({
  getSignerByToken: (...args: unknown[]) => mockGetSignerByToken(...args),
  recordSignature: (...args: unknown[]) => mockRecordSignature(...args),
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  updateContract: (...args: unknown[]) => mockUpdateContract(...args),
}));

import { signContractAction } from '@/app/firmar/[token]/sign-action';

const VALID_TOKEN = 'a'.repeat(64);
const WRONG_TOKEN_SAME_LEN = 'b'.repeat(64);
const WRONG_TOKEN_DIFF_LEN = 'a'.repeat(32);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signContractAction — token comparison via timingSafeEqual', () => {
  it('token correcto → firma se registra y contrato se marca como firmado', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contractId: 100,
      status: 'pending',
    });
    mockRecordSignature.mockResolvedValue({ id: 1 });
    mockGetContractById.mockResolvedValue({
      id: 100,
      campaignId: 7,
      signers: [
        { id: 1, token: VALID_TOKEN, status: 'pending' },
      ],
    });
    mockUpdateContract.mockResolvedValue({ id: 100 });

    const result = await signContractAction(
      {},
      makeFormData({ token: VALID_TOKEN, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ success: true });
    expect(mockRecordSignature).toHaveBeenCalledWith(VALID_TOKEN, 'Luis', '1.2.3.4');
    expect(mockUpdateContract).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ status: 'signed' }),
    );
  });

  it.each([
    ['misma longitud', WRONG_TOKEN_SAME_LEN],
    ['longitud distinta', WRONG_TOKEN_DIFF_LEN],
  ])('token incorrecto (%s) → rechazado sin mutar', async (_label, badToken) => {
    mockGetSignerByToken.mockResolvedValue(null);

    const result = await signContractAction(
      {},
      makeFormData({ token: badToken, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ error: 'Link de firma inválido o ya usado' });
    expect(mockRecordSignature).not.toHaveBeenCalled();
    expect(mockUpdateContract).not.toHaveBeenCalled();
  });

  it('signer válido pero `contract.signers` contiene token de longitud distinta → no marca contrato como firmado', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contractId: 100,
      status: 'pending',
    });
    mockRecordSignature.mockResolvedValue({ id: 1 });
    mockGetContractById.mockResolvedValue({
      id: 100,
      campaignId: 7,
      signers: [
        { id: 1, token: VALID_TOKEN, status: 'pending' },
        { id: 2, token: WRONG_TOKEN_DIFF_LEN, status: 'pending' },
      ],
    });

    const result = await signContractAction(
      {},
      makeFormData({ token: VALID_TOKEN, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdateContract).not.toHaveBeenCalled();
  });

  it('contrato con varios signers, token solo matchea uno → no marca contrato como firmado si los demás están pending', async () => {
    const otherToken = 'c'.repeat(64);
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contractId: 100,
      status: 'pending',
    });
    mockRecordSignature.mockResolvedValue({ id: 1 });
    mockGetContractById.mockResolvedValue({
      id: 100,
      campaignId: 7,
      signers: [
        { id: 1, token: VALID_TOKEN, status: 'pending' },
        { id: 2, token: otherToken, status: 'pending' },
      ],
    });

    const result = await signContractAction(
      {},
      makeFormData({ token: VALID_TOKEN, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ success: true });
    expect(mockRecordSignature).toHaveBeenCalledTimes(1);
    expect(mockUpdateContract).not.toHaveBeenCalled();
  });

  it('contrato con varios signers, todos los demás ya firmados → marca contrato como firmado', async () => {
    const otherToken = 'c'.repeat(64);
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contractId: 100,
      status: 'pending',
    });
    mockRecordSignature.mockResolvedValue({ id: 1 });
    mockGetContractById.mockResolvedValue({
      id: 100,
      campaignId: 7,
      signers: [
        { id: 1, token: VALID_TOKEN, status: 'pending' },
        { id: 2, token: otherToken, status: 'signed' },
      ],
    });
    mockUpdateContract.mockResolvedValue({ id: 100 });

    const result = await signContractAction(
      {},
      makeFormData({ token: VALID_TOKEN, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdateContract).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ status: 'signed' }),
    );
  });

  it('signer ya firmado → rechazado', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contractId: 100,
      status: 'signed',
    });

    const result = await signContractAction(
      {},
      makeFormData({ token: VALID_TOKEN, signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ error: 'Este contrato ya ha sido firmado' });
    expect(mockRecordSignature).not.toHaveBeenCalled();
  });

  it('falta token → error de validación temprano', async () => {
    const result = await signContractAction(
      {},
      makeFormData({ token: '', signedName: 'Luis', accepted: 'on' }),
    );

    expect(result).toEqual({ error: 'Token inválido' });
    expect(mockGetSignerByToken).not.toHaveBeenCalled();
  });
});
