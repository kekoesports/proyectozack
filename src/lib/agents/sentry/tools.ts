import 'server-only';

import { defineReadTool } from '../tools/define';
import type { ErasedAgentTool } from '../types';
import { readSentryIssues } from './client';

export const getSentryIssuesTool: ErasedAgentTool = defineReadTool({
  name: 'getSentryIssues',
  description: 'Incidencias abiertas de Sentry SocialPro web: IDs compartidos entre Guardian y Dev, frecuencia y última aparición. Solo lectura, sin datos de usuarios ni eventos crudos. No prueba causa raíz ni reparación.',
  permission: { module: 'infrastructure', action: 'read' },
  run: async () => readSentryIssues(),
});

export const SENTRY_TOOLS: readonly ErasedAgentTool[] = [getSentryIssuesTool];
