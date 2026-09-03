import 'server-only';

import { createPanelConfiguration } from '@/features/kekopilot-panel/branding';
import type { KekoPilotPanelConfig } from '@/features/kekopilot-panel/data';
import { env } from '@/lib/env';

export function getKekoPilotPanelConfig(): KekoPilotPanelConfig {
  return createPanelConfiguration({
    productName: env.KEKOPILOT_PANEL_BRAND_NAME,
    assistantName: env.KEKOPILOT_PANEL_ASSISTANT_NAME,
    agentName: env.KEKOPILOT_PANEL_AGENT_NAME,
    accentColor: env.KEKOPILOT_PANEL_ACCENT_COLOR,
    referencePrefix: env.KEKOPILOT_PANEL_REFERENCE_PREFIX,
    supportHref: env.KEKOPILOT_PANEL_SUPPORT_URL,
    ...(env.KEKOPILOT_PANEL_LOGO_PATH ? { logoPath: env.KEKOPILOT_PANEL_LOGO_PATH } : {}),
    workspaceName: env.KEKOPILOT_PANEL_WORKSPACE_NAME,
    workspaceMeta: env.KEKOPILOT_PANEL_WORKSPACE_META,
    ...(env.KEKOPILOT_PANEL_WORKSPACE_INITIALS
      ? { workspaceInitials: env.KEKOPILOT_PANEL_WORKSPACE_INITIALS }
      : {}),
    homeHref: env.KEKOPILOT_PANEL_HOME_PATH,
  });
}
