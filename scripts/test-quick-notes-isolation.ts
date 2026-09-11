import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { quickNotesFixture } from './quick-notes-fixture';
import * as schema from '../src/db/schema';
import {
  createQuickNoteStore,
  saveAndInterpretNote,
} from '../src/lib/quick-notes/store';
import { interpretQuickNote } from '../src/lib/quick-notes/interpret';
import { canReadTask } from '../src/lib/quick-notes/access';
import {
  createTaskNoticeStore,
  syncTaskNotices,
} from '../src/lib/quick-notes/notices';
import { civilDate, madridInstant } from '../src/lib/quick-notes/time';
import { taskFormSchema, taskPatchSchema } from '../src/lib/schemas/task';

async function main() {
  const fixture = await quickNotesFixture(55441);
  const db = fixture.database;
  let count = 0;
  const pass = (name: string) => {
    count++;
    console.log('PASS ' + name);
  };
  const a = { userId: 'pablo-qa', role: 'admin' as const };
  const b = { userId: 'alfonso-qa', role: 'admin_limited_tasks' as const };
  const c = { userId: 'staff-qa', role: 'staff' as const };
  const other = { userId: 'other-qa', role: 'admin' as const };
  const store = createQuickNoteStore(db);
  const notices = createTaskNoticeStore(db);
  const note = (body: string, mode = 'auto') => ({
    id: randomUUID(),
    body,
    mode,
    relation: null,
  });
  try {
    const [history] = await db
      .select()
      .from(schema.crmTasks)
      .where(eq(schema.crmTasks.ownerId, 'history'));
    assert.equal(history?.title, 'HISTORY DO NOT CHANGE');
    assert.equal(history?.weekLabel, '2025-W01');
    assert.equal(history?.status, 'pendiente');
    pass('0161 migration preserves historical task');
    const input = note('Rinna prefiere las miniaturas rosas');
    const info = await saveAndInterpretNote(store, a, input);
    assert.equal(info.taskId, null);
    assert.equal(
      (await createQuickNoteStore(db).detail(a, input.id)).note.body,
      input.body,
    );
    pass('save/reload information without task');
    await assert.rejects(store.detail(other, input.id));
    await assert.rejects(
      store.edit(other, { id: input.id, version: 1, body: 'Intrusion' }),
    );
    assert.equal((await store.list(other, { view: 'shared' })).length, 0);
    pass(
      'private note inaccessible by direct read/write, including other admin',
    );
    await store.share(a, { id: input.id, userIds: [b.userId] });
    assert.equal((await store.detail(b, input.id)).note.body, input.body);
    await assert.rejects(store.archive(b, input.id, true));
    await store.share(a, { id: input.id, userIds: [] });
    await assert.rejects(store.detail(b, input.id));
    pass('explicit read-only sharing and revocation');
    const action = note('Hablar con la marca');
    const concurrent = await Promise.all(
      Array.from({ length: 4 }, () => saveAndInterpretNote(store, a, action)),
    );
    const taskId = concurrent[0]?.taskId;
    assert.ok(taskId);
    assert.ok(concurrent.every((r) => r.taskId === taskId));
    assert.equal(
      (
        await db
          .select()
          .from(schema.quickNoteConversions)
          .where(eq(schema.quickNoteConversions.noteId, action.id))
      ).length,
      1,
    );
    const before = (await store.detail(a, action.id)).task;
    assert.ok(before);
    assert.equal(before.dueDate, null);
    assert.equal(before.relatedId, null);
    pass(
      'double submission/retry creates exactly one task (serialized fixture transactions)',
    );
    await store.edit(a, { id: action.id, version: 1, body: 'Texto revisado' });
    const after = await store.detail(a, action.id);
    assert.equal(after.task?.title, before.title);
    assert.equal(after.note.originalText, action.body);
    await assert.rejects(
      store.edit(a, { id: action.id, version: 1, body: 'Stale version' }),
    );
    pass('edit preserves original/task and rejects stale versions');
    const solo = await saveAndInterpretNote(
      store,
      a,
      note('Pedir contrato mañana', 'note'),
    );
    assert.equal(solo.taskId, null);
    const failureInput = note('Preparar contrato');
    const failed = await saveAndInterpretNote(store, a, failureInput, () => {
      throw Error('fixture injected interpretation failure');
    });
    assert.equal(failed.note.originalText, failureInput.body);
    assert.ok(failed.warning);
    assert.equal(failed.taskId, null);
    pass('note-only and interpreter failure preserve note without task');
    const users = await store.users(a);
    const at = new Date('2026-09-10T22:30:00Z');
    const tomorrow = interpretQuickNote(
      'Mañana pedir a Rinna la aprobación de la miniatura',
      at,
      a,
      users,
    );
    assert.equal(tomorrow.startDate, '2026-09-12');
    assert.equal(tomorrow.dueDate, null);
    assert.equal(civilDate(at), '2026-09-11');
    assert.equal(
      interpretQuickNote('Reclamar contrato, fecha límite mañana', at, a, users)
        .dueDate,
      '2026-09-12',
    );
    assert.equal(madridInstant('2026-03-29T02:30'), null);
    assert.equal(madridInstant('2026-10-25T02:30'), null);
    assert.equal(madridInstant('2026-09-11T09:30'), '2026-09-11T07:30:00.000Z');
    assert.equal(
      interpretQuickNote('Quizás montar una campaña para Navidad', at, a, users)
        .kind,
      'confirm',
    );
    assert.equal(
      interpretQuickNote('Pedir contrato y revisar miniatura', at, a, users)
        .kind,
      'confirm',
    );
    assert.equal(
      interpretQuickNote('No enviar el contrato', at, a, users).kind,
      'confirm',
    );
    assert.equal(
      interpretQuickNote(
        'Pedir contrato el viernes de la semana que viene',
        at,
        a,
        users,
      ).startDate,
      null,
    );
    pass(
      'Madrid rollover, work/deadline separation, DST and ambiguous/multiple actions',
    );
    const mentionInput = note('@Alfonso reclamar el contrato el viernes');
    const mentioned = await saveAndInterpretNote(store, a, mentionInput);
    assert.equal(mentioned.taskId, null);
    assert.equal(mentioned.suggestion?.assigneeId, b.userId);
    const conversion = {
      id: mentionInput.id,
      version: 1,
      title: 'Reclamar contrato',
      assigneeId: b.userId,
    };
    await assert.rejects(store.convert(a, conversion));
    const assigned = await store.convert(a, {
      ...conversion,
      confirmDisclosure: true,
    });
    assert.ok(assigned.taskId);
    await assert.rejects(store.detail(b, mentionInput.id));
    const staffNote = await store.save(c, note('Reclamar contrato', 'note'));
    await assert.rejects(
      store.convert(c, {
        ...conversion,
        id: staffNote.id,
        confirmDisclosure: true,
      }),
    );
    await assert.rejects(
      store.save(c, {
        ...note('Marca'),
        relation: { type: 'brand', id: 999999 },
      }),
    );
    assert.equal(canReadTask(b, before), false);
    pass(
      'allowed/denied assignment; mention never shares note; limited admin and relation scope preserved',
    );
    const future = await saveAndInterpretNote(
      store,
      a,
      note('Pedir contrato 2030-01-10'),
    );
    assert.ok(future.taskId);
    assert.equal(
      (await store.detail(a, future.note.id)).task?.startDate,
      '2030-01-10',
    );
    assert.ok(
      canReadTask(a, (await store.detail(a, future.note.id)).task ?? before),
    );
    pass('future task readable independently of week');
    await store.undo(a, action.id);
    assert.equal((await store.detail(a, action.id)).task?.status, 'archivada');
    await assert.rejects(
      store.convert(a, {
        ...conversion,
        id: action.id,
        version: 2,
        assigneeId: a.userId,
      }),
    );
    await db
      .update(schema.crmTasks)
      .set({ status: 'en_progreso' })
      .where(eq(schema.crmTasks.id, future.taskId));
    await assert.rejects(store.undo(a, future.note.id));
    pass(
      'audited undo; managed task protected; undone conversion cannot duplicate',
    );
    const now = new Date('2026-09-10T10:00:00Z');
    const high = await db
      .insert(schema.crmTasks)
      .values(
        Array.from({ length: 6 }, (_, n) => ({
          title: 'Overdue QA ' + n,
          ownerId: a.userId,
          assignedToUserId: a.userId,
          category: 'General',
          weekLabel: '2026-W36',
          priority: n < 2 ? ('baja' as const) : ('alta' as const),
          dueDate: '2026-09-01',
        })),
      )
      .returning();
    const firstSync = await syncTaskNotices(db, now);
    assert.equal(firstSync.created, 4);
    assert.equal((await syncTaskNotices(db, now)).created, 0);
    const tabA = randomUUID(),
      tabB = randomUUID();
    const [pollA, pollB] = await Promise.all([
      notices.poll(a, tabA, now),
      notices.poll(a, tabB, now),
    ]);
    const claimedA = pollA.notices.filter((n) => n.claimed),
      claimedB = pollB.notices.filter((n) => n.claimed);
    assert.equal(claimedA.length + claimedB.length, 4);
    assert.equal(new Set([...claimedA, ...claimedB].map((n) => n.id)).size, 4);
    const winner = claimedA.length ? tabA : tabB;
    const loser = winner === tabA ? tabB : tabA;
    const ids = [...claimedA, ...claimedB].map((n) => n.id);
    await notices.change(a, { ids, action: 'presented', tabId: winner }, now);
    assert.equal(
      (
        await notices.poll(a, loser, new Date(now.getTime() + 200_000))
      ).notices.filter((n) => n.claimed).length,
      0,
    );
    await assert.rejects(
      notices.change(b, { ids, action: 'read', tabId: loser }, now),
    );
    pass(
      'all four high tasks beyond oldest low rows; dedupe, ACK/navigation/tab ownership and recipient guard',
    );
    const until = new Date(now.getTime() + 3_600_000);
    await notices.change(
      a,
      { ids, action: 'snooze', tabId: winner, until: until.toISOString() },
      now,
    );
    assert.equal(
      (await notices.poll(a, winner, now)).notices.filter((n) => n.claimed)
        .length,
      0,
    );
    const reminder = await notices.poll(
      a,
      loser,
      new Date(until.getTime() + 1),
    );
    assert.equal(reminder.notices.filter((n) => n.claimed).length, 4);
    await notices.change(a, { ids, action: 'read', tabId: loser }, until);
    assert.equal(
      (await notices.poll(a, loser, until)).notices.filter((n) => n.claimed)
        .length,
      0,
    );
    const completed = high[2],
      demoted = high[3],
      archived = high[4],
      reassigned = high[5];
    assert.ok(completed && demoted && archived && reassigned);
    await db
      .update(schema.crmTasks)
      .set({ status: 'completada' })
      .where(eq(schema.crmTasks.id, completed.id));
    await db
      .update(schema.crmTasks)
      .set({ priority: 'media' })
      .where(eq(schema.crmTasks.id, demoted.id));
    await db
      .update(schema.crmTasks)
      .set({ status: 'archivada' })
      .where(eq(schema.crmTasks.id, archived.id));
    await db
      .update(schema.crmTasks)
      .set({ ownerId: b.userId, assignedToUserId: b.userId })
      .where(eq(schema.crmTasks.id, reassigned.id));
    assert.equal((await notices.poll(a, winner, until)).notices.length, 0);
    assert.equal((await notices.poll(b, loser, until)).notices.length, 1);
    assert.equal(
      (
        await notices.poll(b, loser, new Date('2026-09-12T10:00:00Z'))
      ).notices.filter((n) => n.claimed).length,
      0,
    );
    assert.equal(
      (
        await notices.poll(b, loser, new Date('2026-09-10T21:00:00Z'))
      ).notices.filter((n) => n.claimed).length,
      0,
    );
    pass(
      'hour snooze/read distinct from completion; complete/archive/demote/reassign cancellation; working hours',
    );
    assert.ok(
      taskFormSchema.safeParse({
        title: 'Start date',
        description: null,
        ownerId: a.userId,
        startDate: '2026-09-11',
        dueDate: null,
        priority: 'media',
        status: 'pendiente',
        category: 'General',
      }).success,
    );
    assert.equal(
      taskPatchSchema.safeParse({ startDate: '2026-02-30' }).success,
      false,
    );
    pass(
      'task date boundary accepts valid work date and rejects impossible date',
    );
    const timed = await db
      .insert(schema.crmTasks)
      .values({
        title: 'Precise reminder QA',
        ownerId: c.userId,
        category: 'General',
        weekLabel: '2026-W37',
        priority: 'baja',
        remindAt: new Date(now.getTime() - 1000),
      })
      .returning();
    const timedTask = timed[0];
    assert.ok(timedTask);
    const timerTab = randomUUID();
    const timerPoll = await notices.poll(c, timerTab, now);
    assert.equal(timerPoll.notices[0]?.type, 'task_reminder');
    assert.equal(timerPoll.notices[0]?.claimed, true);
    await db
      .update(schema.crmTasks)
      .set({ remindAt: new Date(now.getTime() + 10_000) })
      .where(eq(schema.crmTasks.id, timedTask.id));
    assert.equal((await notices.poll(c, timerTab, now)).notices.length, 0);
    assert.equal(
      (await notices.poll(c, timerTab, new Date(now.getTime() + 20_000)))
        .notices[0]?.claimed,
      true,
    );
    pass(
      'precise reminder independent of priority/deadline; rescheduling cancels old notice',
    );
    console.log(
      'ISOLATION PASS: ' +
        count +
        ' scenarios. No real data or outbound messages.',
    );
  } finally {
    await fixture.close();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
