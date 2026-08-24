jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/queries/agents/workers', () => ({ touchWorkerHeartbeat: jest.fn() }));

import {
  startWorkerPresenceHeartbeat,
  WORKER_PRESENCE_HEARTBEAT_MS,
} from '@/lib/agents/worker/presence-heartbeat';

describe('presencia del worker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renueva mucho antes de la ventana de 120 s del CRM', () => {
    expect(WORKER_PRESENCE_HEARTBEAT_MS).toBeLessThan(120_000);
  });

  it('sigue escribiendo mientras el worker está ocioso y se detiene al apagar', async () => {
    const writeHeartbeat = jest.fn().mockResolvedValue(undefined);
    const heartbeat = startWorkerPresenceHeartbeat({
      workerId: 'worker-1',
      version: 'abc123',
      hostname: 'container',
      intervalMs: 1_000,
      writeHeartbeat,
    });

    await heartbeat.touch();
    expect(writeHeartbeat).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
    expect(writeHeartbeat).toHaveBeenCalledTimes(2);

    await heartbeat.stop();
    jest.advanceTimersByTime(5_000);
    expect(writeHeartbeat).toHaveBeenCalledTimes(2);
  });
});
