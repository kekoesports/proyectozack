import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('task rollover — recurring vs one-off', () => {
  it('closes recurring rows instead of dragging them', () => {
    const src = read('src/lib/queries/task-rollover.ts');
    expect(src).toMatch(/status: 'no_realizada'/);
    expect(src).toMatch(/isNotNull\(crmTasks\.recurrenceTemplateId\)/);
    expect(src).toMatch(/isNull\(crmTasks\.recurrenceTemplateId\)/);
  });

  it('sanitation has no bulk complete/archive', () => {
    const src = read('src/features/admin/tasks/components/TaskSanitationClient.tsx');
    expect(src).toMatch(/No hay acción masiva/);
    expect(src).not.toMatch(/Completar todas|Archivar todas/);
  });

  it('open unique is limited to pending/in_progress', () => {
    const src = read('src/db/schema/crmTasks.ts');
    expect(src).toMatch(/status IN \('pendiente', 'en_progreso'\)/);
  });
});
