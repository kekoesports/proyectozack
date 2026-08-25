import { OPERATION_AGENT_SCHEDULES, OPERATION_AGENT_TOOL_NAMES } from '@/lib/agents/operations/definition';
import { operationSystemPrompt } from '@/lib/agents/operations/prompts';

it('define rutinas con slugs únicos y zona de Madrid', () => {
  expect(new Set(OPERATION_AGENT_SCHEDULES.map((schedule) => schedule.slug)).size)
    .toBe(OPERATION_AGENT_SCHEDULES.length);
  expect(OPERATION_AGENT_SCHEDULES.every((schedule) => schedule.timezone === 'Europe/Madrid')).toBe(true);
});

it('cada agente operativo tiene una tool propia y un prompt de shadow', () => {
  for (const slug of ['crm-steward', 'deal-clerk', 'growth', 'seo'] as const) {
    expect(OPERATION_AGENT_TOOL_NAMES[slug]).toHaveLength(1);
    expect(operationSystemPrompt(slug, 'shadow')).toMatch(/modo shadow/i);
  }
  expect(operationSystemPrompt('dev', 'shadow')).toBeNull();
});

it('el agente SEO no confunde datos ausentes del colector con incidencias confirmadas', () => {
  const prompt = operationSystemPrompt('seo', 'shadow');

  expect(prompt).toMatch(/sitemaps: \[\].*no obtuvo ese dato/i);
  expect(prompt).toMatch(/no afirmes que faltan/i);
});
