/**
 * Aprobaciones humanas.
 *
 * Lo que se prueba aquí es la promesa completa del centro de aprobaciones:
 * una aprobación vale para una acción exacta, una sola vez, durante una
 * ventana limitada, y el doble clic no ejecuta dos veces.
 */

jest.mock('server-only', () => ({}));

const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
jest.mock('@/lib/db', () => ({ db: { update: mockUpdate, select: mockSelect, insert: mockInsert } }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  checkApprovalUsable,
  isTerminalApprovalStatus,
  nextApprovalStatus,
  requiresApproval,
  type AgentApprovalSnapshot,
} from '@/lib/agents/approval-state';
import { consumeApproval, createApprovalRequest, decideApproval } from '@/lib/queries/agents/approvals';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const AHORA = new Date('2026-08-21T10:00:00.000Z');

function snapshot(over: Partial<AgentApprovalSnapshot> = {}): AgentApprovalSnapshot {
  return {
    status: 'approved',
    actionHash: HASH_A,
    actionClass: 'external_side_effect',
    expiresAt: new Date('2026-08-21T11:00:00.000Z'),
    consumedAt: null,
    ...over,
  };
}

describe('máquina de estados', () => {
  it('solo se decide lo que está pendiente', () => {
    expect(nextApprovalStatus('pending', 'approve')).toEqual({ ok: true, next: 'approved' });
    expect(nextApprovalStatus('pending', 'reject')).toEqual({ ok: true, next: 'rejected' });
    expect(nextApprovalStatus('approved', 'approve')).toEqual({
      ok: false,
      code: 'approval_not_pending',
    });
  });

  it('una decisión ya tomada no se revisa', () => {
    for (const estado of ['rejected', 'expired', 'cancelled', 'consumed'] as const) {
      expect(nextApprovalStatus(estado, 'approve')).toEqual({
        ok: false,
        code: 'approval_already_decided',
      });
    }
  });

  it('consumir parte de aprobada y solo una vez', () => {
    expect(nextApprovalStatus('approved', 'consume')).toEqual({ ok: true, next: 'consumed' });
    expect(nextApprovalStatus('consumed', 'consume')).toEqual({
      ok: false,
      code: 'approval_already_consumed',
    });
    expect(nextApprovalStatus('pending', 'consume')).toEqual({
      ok: false,
      code: 'approval_not_approved',
    });
  });

  it('caducar y cancelar solo afectan a lo que sigue vivo', () => {
    expect(nextApprovalStatus('pending', 'expire')).toEqual({ ok: true, next: 'expired' });
    expect(nextApprovalStatus('approved', 'cancel')).toEqual({ ok: true, next: 'cancelled' });
    expect(nextApprovalStatus('consumed', 'cancel')).toEqual({
      ok: false,
      code: 'approval_already_decided',
    });
  });

  it('reconoce los estados terminales', () => {
    expect(isTerminalApprovalStatus('consumed')).toBe(true);
    expect(isTerminalApprovalStatus('pending')).toBe(false);
    expect(isTerminalApprovalStatus('approved')).toBe(false);
  });
});

describe('qué exige aprobación', () => {
  it('los efectos externos y los privilegios, siempre', () => {
    expect(requiresApproval('external_side_effect')).toBe(true);
    expect(requiresApproval('privileged')).toBe(true);
  });

  it('leer y preparar borradores, no', () => {
    expect(requiresApproval('read')).toBe(false);
    expect(requiresApproval('internal_draft')).toBe(false);
  });
});

describe('checkApprovalUsable', () => {
  it('acepta la aprobación correcta y vigente', () => {
    expect(checkApprovalUsable(snapshot(), HASH_A, AHORA)).toEqual({ ok: true });
  });

  it('rechaza si el hash no coincide: los argumentos cambiaron', () => {
    expect(checkApprovalUsable(snapshot(), HASH_B, AHORA)).toEqual({
      ok: false,
      code: 'approval_hash_mismatch',
    });
  });

  it('el hash se comprueba ANTES que la caducidad', () => {
    // Aprobar otra acción y que el error hable de fechas despistaría al humano
    // que revisa por qué no se ejecutó.
    const caducadaYDistinta = snapshot({ expiresAt: new Date('2026-08-21T09:00:00.000Z') });
    expect(checkApprovalUsable(caducadaYDistinta, HASH_B, AHORA)).toEqual({
      ok: false,
      code: 'approval_hash_mismatch',
    });
  });

  it('rechaza una aprobación caducada', () => {
    expect(
      checkApprovalUsable(snapshot({ expiresAt: new Date('2026-08-21T09:59:59.000Z') }), HASH_A, AHORA),
    ).toEqual({ ok: false, code: 'approval_expired' });
  });

  it('rechaza una ya consumida aunque el estado diga otra cosa', () => {
    expect(checkApprovalUsable(snapshot({ consumedAt: AHORA }), HASH_A, AHORA)).toEqual({
      ok: false,
      code: 'approval_already_consumed',
    });
  });

  it('nunca deja pasar una acción forbidden', () => {
    expect(checkApprovalUsable(snapshot({ actionClass: 'forbidden' }), HASH_A, AHORA)).toEqual({
      ok: false,
      code: 'approval_action_forbidden',
    });
  });
});

// ── Repositorio ──────────────────────────────────────────────────────────────

function stubUpdate(devuelve: readonly unknown[]): void {
  mockUpdate.mockReturnValue({
    set: () => ({ where: () => ({ returning: async () => devuelve }) }),
  });
}

function stubSelect(devuelve: readonly unknown[]): void {
  mockSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => devuelve }) }) });
}

describe('createApprovalRequest', () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  function stubInsert(devuelve: readonly unknown[]): void {
    mockInsert.mockReturnValue({
      values: () => ({ onConflictDoNothing: () => ({ returning: async () => devuelve }) }),
    });
  }

  it('crea la solicitud', async () => {
    stubInsert([{ id: 1, status: 'pending' }]);
    const row = await createApprovalRequest({
      runId: 1,
      toolCallId: 2,
      actionHash: HASH_A,
      actionClass: 'external_side_effect',
      title: 'Enviar email',
      expiresAt: new Date('2026-08-21T11:00:00.000Z'),
    });
    expect(row.id).toBe(1);
  });

  it('una acción forbidden no llega ni a escribirse', async () => {
    await expect(
      createApprovalRequest({
        runId: 1,
        toolCallId: 2,
        actionHash: HASH_A,
        actionClass: 'forbidden',
        title: 'Transferencia',
        expiresAt: new Date('2026-08-21T11:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'agent_approval_invalid' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('una segunda pendiente con el mismo hash da código estable, no un error crudo de la base', async () => {
    // El índice parcial es global: dos ejecuciones que proponen la misma acción
    // externa no abren dos solicitudes que un humano podría firmar por separado.
    stubInsert([]);
    await expect(
      createApprovalRequest({
        runId: 7,
        toolCallId: 9,
        actionHash: HASH_A,
        actionClass: 'external_side_effect',
        title: 'Enviar email',
        expiresAt: new Date('2026-08-21T11:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'agent_approval_duplicate' });
  });
});

describe('decideApproval', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockSelect.mockReset();
  });

  it('aprueba lo que estaba pendiente y vigente', async () => {
    stubUpdate([{ id: 1, status: 'approved' }]);
    const res = await decideApproval({ approvalId: 1, decision: 'approved', decidedByUserId: 'u1' });
    expect(res.ok).toBe(true);
  });

  it('el segundo clic no vuelve a decidir', async () => {
    // El UPDATE exige status='pending'; la segunda vez no encuentra fila.
    stubUpdate([]);
    stubSelect([{ id: 1, status: 'approved' }]);
    const res = await decideApproval({ approvalId: 1, decision: 'approved', decidedByUserId: 'u2' });
    expect(res).toEqual({ ok: false, code: 'approval_already_decided' });
  });

  it('una pendiente vencida no se rescata firmándola tarde', async () => {
    stubUpdate([]);
    stubSelect([{ id: 1, status: 'pending' }]);
    const res = await decideApproval({ approvalId: 1, decision: 'approved', decidedByUserId: 'u1' });
    expect(res).toEqual({ ok: false, code: 'approval_expired' });
  });
});

describe('consumeApproval', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockSelect.mockReset();
  });

  it('gasta una aprobación válida', async () => {
    stubUpdate([{ id: 1, status: 'consumed' }]);
    const res = await consumeApproval(1, HASH_A);
    expect(res.ok).toBe(true);
  });

  it('no se puede gastar dos veces', async () => {
    stubUpdate([]);
    stubSelect([{ id: 1, status: 'consumed', actionHash: HASH_A }]);
    const res = await consumeApproval(1, HASH_A);
    expect(res).toEqual({ ok: false, code: 'approval_already_consumed' });
  });

  it('no sirve para otra acción', async () => {
    stubUpdate([]);
    stubSelect([{ id: 1, status: 'approved', actionHash: HASH_A }]);
    const res = await consumeApproval(1, HASH_B);
    expect(res).toEqual({ ok: false, code: 'approval_hash_mismatch' });
  });
});
