import type { KekoPilotPanelConfig } from './data';

export type PanelConfigurationInput = {
  readonly productName: string;
  readonly assistantName: string;
  readonly agentName: string;
  readonly accentColor: string;
  readonly referencePrefix: string;
  readonly supportHref: string;
  readonly logoPath?: string;
  readonly workspaceName: string;
  readonly workspaceMeta: string;
  readonly workspaceInitials?: string;
  readonly homeHref: string;
};

function initials(value: string, fallback: string): string {
  const result = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return result || fallback;
}

function contrastingTextColor(hexColor: string): '#111515' | '#ffffff' {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 255_000;
  return luminance > 0.58 ? '#111515' : '#ffffff';
}

export function createPanelConfiguration(input: PanelConfigurationInput): KekoPilotPanelConfig {
  return {
    branding: {
      productName: input.productName,
      productInitials: initials(input.productName, 'KP'),
      assistantName: input.assistantName,
      agentName: input.agentName,
      accentColor: input.accentColor,
      accentTextColor: contrastingTextColor(input.accentColor),
      referencePrefix: input.referencePrefix,
      supportHref: input.supportHref,
      ...(input.logoPath ? { logoPath: input.logoPath } : {}),
    },
    workspace: {
      name: input.workspaceName,
      meta: input.workspaceMeta,
      initials: input.workspaceInitials || initials(input.workspaceName, 'WS'),
      homeHref: input.homeHref,
    },
  };
}
