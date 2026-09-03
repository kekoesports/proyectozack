import { createPanelConfiguration } from '@/features/kekopilot-panel/branding';
import { SOCIALPRO_URL } from '@/features/kekopilot/content';

describe('KekoPilot panel white-label configuration', () => {
  it('derives a complete customer identity without product defaults leaking through', () => {
    const configuration = createPanelConfiguration({
      productName: 'Northrail OS',
      assistantName: 'Atlas Operaciones',
      agentName: 'Atlas',
      accentColor: '#1849a9',
      referencePrefix: 'NR',
      supportHref: 'https://northrail.example/support',
      logoPath: '/brands/northrail.svg',
      workspaceName: 'Northrail Agency',
      workspaceMeta: 'Workspace comercial',
      homeHref: '/admin',
    });

    expect(configuration.branding).toEqual({
      productName: 'Northrail OS',
      productInitials: 'NO',
      assistantName: 'Atlas Operaciones',
      agentName: 'Atlas',
      accentColor: '#1849a9',
      accentTextColor: '#ffffff',
      referencePrefix: 'NR',
      supportHref: 'https://northrail.example/support',
      logoPath: '/brands/northrail.svg',
    });
    expect(configuration.workspace).toEqual({
      name: 'Northrail Agency',
      meta: 'Workspace comercial',
      initials: 'NA',
      homeHref: '/admin',
    });
  });

  it('uses dark text for bright customer accents', () => {
    const configuration = createPanelConfiguration({
      productName: 'Client Hub',
      assistantName: 'Operations',
      agentName: 'Agent',
      accentColor: '#f6d365',
      referencePrefix: 'CH',
      supportHref: 'https://client.example',
      workspaceName: 'Client',
      workspaceMeta: 'Producción',
      homeHref: '/admin',
    });

    expect(configuration.branding.accentTextColor).toBe('#111515');
    expect(configuration.branding.logoPath).toBeUndefined();
  });
});

describe('KekoPilot public attribution', () => {
  it('uses the canonical SocialPro website for product backlinks', () => {
    expect(SOCIALPRO_URL).toBe('https://socialpro.es');
  });
});
