jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { getAgentToolRegistry } from '@/lib/agents/tools';
import { getSentryIssuesTool } from '@/lib/agents/sentry/tools';
import { hasPermission } from '@/lib/permissions';
import { operationSystemPrompt } from '@/lib/agents/operations/prompts';

test('only Guardian and Dev receive the Sentry tool', () => {
  const registry = getAgentToolRegistry();
  for (const slug of ['guardian', 'dev']) {
    expect(registry.isAllowedForAgent(slug, 'getSentryIssues')).toBe(true);
    expect(operationSystemPrompt(slug, 'shadow')).toContain('getSentryIssues');
  }
  for (const slug of ['growth', 'seo', 'crm-steward', 'deal-clerk', 'unknown']) {
    expect(registry.isAllowedForAgent(slug, 'getSentryIssues')).toBe(false);
  }
});

test('read-only tool retains infrastructure authorization', () => {
  expect(getSentryIssuesTool.actionClass).toBe('read');
  expect(getSentryIssuesTool.requiredPermission).toEqual({ module: 'infrastructure', action: 'read' });
  expect(hasPermission('brand', 'infrastructure', 'read')).toBe(false);
  expect(hasPermission('admin', 'infrastructure', 'read')).toBe(true);
});
