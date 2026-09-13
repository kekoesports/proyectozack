import { open } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

/** Thirty total calls explicitly authorized; existing reservations are never reset. */
export async function reserveIntakePilotRequest(directory: string): Promise<boolean> {
  if (!isAbsolute(directory)) return false;
  // Provision this private directory on persistent storage before enabling AI.
  // Never create/reset it here: restarting a container must not reset the budget.
  for (let slot = 1; slot <= 30; slot++) {
    try {
      const handle = await open(join(directory, `request-${slot}.reserved`), 'wx', 0o600);
      await handle.close();
      return true;
    } catch (error: unknown) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'EEXIST') return false;
    }
  }
  return false;
}
