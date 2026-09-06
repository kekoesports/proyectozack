'use client';

import { createContext, useContext } from 'react';

const Workspace = createContext<number | undefined>(undefined);

/** The server supplies this page's identity; each write is checked against live access. */
export function StudioWorkspaceProvider({ talentId, children }: { talentId: number; children: React.ReactNode }) {
  return <Workspace.Provider value={talentId}>{children}</Workspace.Provider>;
}
export function useStudioWorkspace() { return useContext(Workspace); }
