/** Real browser + real session validation on loopback fixture ONLY. No auth bypass or outbound provider. */
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium, expect, type BrowserContext } from '@playwright/test';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
const origin = 'http://127.0.0.1:3451';
const runTag = randomUUID().slice(0, 8);
const infoText = 'Rinna prefiere las miniaturas rosas · QA navegador ' + runTag;
const futureText = 'Pedir contrato 2030-01-10 · ' + runTag;
const mobileText = 'Hablar con la marca · QA móvil ' + runTag;
async function main() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 55442,
    user: 'notes_fixture',
    database: 'notes_fixture',
    max: 1,
  });
  const db = drizzle(pool, { schema });
  const people = await db.select({ id: schema.user.id }).from(schema.user);
  assert.deepEqual(people.map((p) => p.id).sort(), [
    'alfonso-qa',
    'history',
    'other-qa',
    'pablo-qa',
    'staff-qa',
  ]);
  await db
    .update(schema.crmTasks)
    .set({ status: 'pendiente' })
    .where(eq(schema.crmTasks.title, 'QA aviso vencido'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const screenshotDir = '.scratch/quick-notes/evidence';
  await mkdir(screenshotDir, { recursive: true });
  const errors: string[] = [];
  async function authenticate(context: BrowserContext, userId: string) {
    const token = randomUUID();
    const now = new Date();
    await db
      .insert(schema.session)
      .values({
        id: randomUUID(),
        token,
        userId,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 3_600_000),
      });
    const signature = createHmac(
      'sha256',
      'quick-notes-isolated-fixture-secret-2026',
    )
      .update(token)
      .digest('base64');
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: encodeURIComponent(token + '.' + signature),
        url: origin,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
  }
  async function makeContext(mobile = false) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    // Third-party media/telemetry blocked in fixture; CRM requests remain real.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin || url.protocol === 'data:'
        ? route.continue()
        : route.abort();
    });
    context.on('page', (page) =>
      page.on('pageerror', (e) => errors.push(e.message)),
    );
    return context;
  }
  try {
    const context = await makeContext();
    const page = await context.newPage();
    await page.goto(origin + '/admin/notas');
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: 'invalid-forged-fixture',
        url: origin,
      },
    ]);
    await page.goto(origin + '/admin/notas');
    await expect(page).toHaveURL(/\/admin\/login/);
    await authenticate(context, 'pablo-qa');
    await page.goto(origin + '/admin/notas');
    await expect(
      page.getByRole('heading', { name: 'Notas', exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    console.log(
      'PASS unauthenticated/forged session denied; signed persisted session accepted by real Better Auth',
    );
    const fab = page.getByRole('button', { name: '＋ Nota rápida' });
    await fab.click();
    let panel = page.getByRole('dialog', { name: 'Nota rápida', exact: true });
    await panel.getByLabel('Nota', { exact: true }).fill(infoText);
    // Fail transport once, ensuring original draft survives.
    await page.route('**/admin/notas', (route) =>
      route.request().method() === 'POST'
        ? route.abort('failed')
        : route.continue(),
    );
    await panel
      .getByRole('button', { name: 'Guardar nota', exact: true })
      .click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel.getByLabel('Nota', { exact: true })).toHaveValue(
      infoText,
    );
    await page.unroute('**/admin/notas');
    await panel
      .getByRole('button', { name: 'Guardar nota', exact: true })
      .click();
    await expect(panel.getByRole('status')).toHaveText('Nota guardada', {
      timeout: 20_000,
    });
    await panel.getByRole('button', { name: 'Cerrar panel' }).click();
    await expect(fab).toBeFocused();
    await page.reload();
    await expect(page.getByText(infoText, { exact: true })).toBeVisible();
    console.log(
      'PASS desktop: transport failure retains draft; saved note survives reload; keyboard focus restored',
    );
    await fab.click();
    panel = page.getByRole('dialog', { name: 'Nota rápida', exact: true });
    await panel.getByLabel('Nota', { exact: true }).fill(futureText);
    await panel
      .getByRole('button', { name: 'Guardar nota', exact: true })
      .click();
    await expect(panel.getByRole('status')).toHaveText('Tarea creada', {
      timeout: 20_000,
    });
    const taskHref = await panel
      .getByRole('link', { name: 'Abrir tarea', exact: true })
      .getAttribute('href');
    assert.ok(taskHref);
    await panel.getByRole('link', { name: 'Abrir tarea', exact: true }).click();
    await expect(page.getByRole('heading', { name: futureText })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('Trabajo: 2030-01-10 · Límite: Sin fecha'),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Editar tarea', exact: true })
      .click();
    const edit = page.getByRole('dialog', {
      name: 'Editar tarea',
      exact: true,
    });
    await edit
      .getByRole('combobox', { name: 'Estado', exact: true })
      .selectOption('en_progreso');
    await edit.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(edit).toBeHidden();
    await expect(
      page.getByText('en progreso · Prioridad media', { exact: true }),
    ).toBeVisible();
    console.log('PASS future task direct link and real task update action');
    await page.screenshot({
      path: screenshotDir + '/desktop-task.png',
      fullPage: true,
    });
    const privateNote = await db
      .select()
      .from(schema.quickNotes)
      .where(eq(schema.quickNotes.body, infoText));
    assert.equal(privateNote.length, 1);
    const privateId = privateNote[0]?.id;
    assert.ok(privateId);
    await page.goto(origin + '/admin/notas');
    const otherContext = await makeContext();
    await authenticate(otherContext, 'alfonso-qa');
    const otherPage = await otherContext.newPage();
    await otherPage.goto(origin + '/admin/notas');
    await expect(
      otherPage.getByText('No hay notas con estos filtros.', { exact: false }),
    ).toBeVisible();
    await otherPage.goto(origin + taskHref);
    await expect(
      otherPage.getByRole('heading', { name: futureText }),
    ).toHaveCount(0);
    console.log(
      'PASS different user cannot see private notes or direct unrelated future task',
    );
    const privateCard = page.locator('article').filter({ hasText: infoText });
    const directRequest = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        !!request.postData()?.includes(privateId),
    );
    await privateCard.getByRole('button', { name: 'Ver nota' }).click();
    const detailRequest = await directRequest;
    const detailPanel = page.getByRole('dialog', { name: 'Detalle de nota' });
    await expect(detailPanel.getByLabel('Texto de la nota')).toHaveValue(
      infoText,
    );
    const actionId = detailRequest.headers()['next-action'];
    assert.ok(actionId);
    const forbidden = await otherContext.request.post(origin + '/admin/notas', {
      headers: {
        'next-action': actionId,
        'content-type':
          detailRequest.headers()['content-type'] ?? 'text/plain;charset=UTF-8',
        origin,
      },
      data: detailRequest.postData() ?? '',
    });
    const forbiddenBody = await forbidden.text();
    assert.ok(!forbiddenBody.includes(infoText));
    assert.ok(forbiddenBody.includes('Nota no encontrada'));
    await detailPanel
      .getByRole('button', { name: 'Compartir nota', exact: true })
      .click();
    await detailPanel.getByLabel('Alfonso QA', { exact: true }).check();
    await detailPanel.getByRole('button', { name: 'Guardar acceso' }).click();
    await expect(detailPanel.getByRole('status')).toHaveText('Guardado');
    await otherPage.goto(origin + '/admin/notas');
    await otherPage
      .getByRole('button', { name: 'Compartidas conmigo' })
      .click();
    await expect(otherPage.getByText(infoText, { exact: true })).toBeVisible();
    await detailPanel.getByLabel('Alfonso QA', { exact: true }).uncheck();
    await detailPanel.getByRole('button', { name: 'Guardar acceso' }).click();
    await expect
      .poll(
        async () =>
          (
            await db
              .select()
              .from(schema.quickNoteShares)
              .where(eq(schema.quickNoteShares.noteId, privateId))
          ).length,
      )
      .toBe(0);
    await detailPanel.getByRole('button', { name: 'Cerrar panel' }).click();
    await page.getByRole('button', { name: '＋ Nota rápida' }).click();
    panel = page.getByRole('dialog', { name: 'Nota rápida', exact: true });
    await panel
      .getByLabel('Nota', { exact: true })
      .fill('@Alfonso reclamar el contrato el viernes · ' + runTag);
    await panel
      .getByRole('button', { name: 'Guardar nota', exact: true })
      .click();
    await expect(panel.getByRole('status')).toHaveText('Nota guardada');
    await expect(
      panel.getByRole('combobox', { name: 'Responsable', exact: true }),
    ).toHaveValue('alfonso-qa');
    await panel
      .getByRole('combobox', { name: 'Prioridad', exact: true })
      .selectOption('alta');
    await panel
      .getByLabel('Confirmo que esta persona puede ver ese contenido.')
      .check();
    await panel
      .getByRole('button', { name: 'Confirmar y crear tarea' })
      .click();
    await expect(panel.getByRole('status')).toHaveText('Tarea creada');
    await expect(
      panel.getByText(/Responsable: Alfonso QA · Prioridad alta/),
    ).toBeVisible();
    await panel.getByRole('button', { name: 'Cerrar panel' }).click();
    console.log(
      'PASS direct server-action privacy; explicit sharing/revocation; reviewed assignment and accurate confirmation',
    );
    // Existing overdue notice can be reset only because the DB guard above proves this is the synthetic fixture.
    await db
      .update(schema.alerts)
      .set({
        readAt: null,
        presentedAt: null,
        deliveryToken: null,
        deliveryUntil: null,
        snoozedUntilAt: null,
      })
      .where(eq(schema.alerts.title, 'QA aviso vencido'));
    await page.reload();
    await expect(page.getByTestId('task-notice-banner')).toBeVisible({
      timeout: 15_000,
    });
    const second = await context.newPage();
    await second.goto(origin + '/admin/notas');
    await expect(
      second.getByRole('button', { name: /Avisos de tareas/ }),
    ).toBeVisible();
    await expect(second.getByTestId('task-notice-banner')).toHaveCount(0);
    await page
      .getByTestId('task-notice-banner')
      .getByRole('button', { name: 'Recordar en 1 hora' })
      .click();
    await expect(page.getByTestId('task-notice-banner')).toHaveCount(0);
    const overdue = (
      await db
        .select()
        .from(schema.crmTasks)
        .where(eq(schema.crmTasks.title, 'QA aviso vencido'))
    )[0];
    assert.ok(overdue);
    const savedNotice = (
      await db
        .select()
        .from(schema.alerts)
        .where(eq(schema.alerts.title, overdue.title))
    )[0];
    assert.ok(savedNotice?.snoozedUntilAt);
    assert.equal(overdue.status, 'pendiente');
    await page.goto(origin + '/admin/tareas/' + overdue.id);
    await page
      .getByRole('button', { name: 'Editar tarea', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('combobox', { name: 'Estado', exact: true })
      .selectOption('completada');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Guardar tarea' })
      .click();
    await expect(page.getByRole('dialog')).toBeHidden();
    const cron = await context.request.get(
      origin + '/api/cron/sync-task-notices',
      { headers: { Authorization: 'Bearer notes-fixture-cron-only' } },
    );
    assert.equal(cron.status(), 200);
    const resolved = (
      await db
        .select()
        .from(schema.alerts)
        .where(eq(schema.alerts.id, savedNotice.id))
    )[0];
    assert.equal(resolved?.status, 'resolved');
    const deniedCron = await context.request.get(
      origin + '/api/cron/sync-task-notices',
    );
    assert.equal(deniedCron.status(), 401);
    console.log(
      'PASS real multi-tab delivery, persisted snooze, completion cancels, cron authorization',
    );
    const mobile = await makeContext(true);
    await authenticate(mobile, 'pablo-qa');
    const phone = await mobile.newPage();
    await phone.goto(origin + '/admin/notas');
    await phone.getByRole('button', { name: '＋ Nota rápida' }).click();
    const mobilePanel = phone.getByRole('dialog', {
      name: 'Nota rápida',
      exact: true,
    });
    await mobilePanel.getByLabel('Nota', { exact: true }).fill(mobileText);
    await mobilePanel
      .getByRole('button', { name: 'Guardar nota', exact: true })
      .click();
    await expect(mobilePanel.getByRole('status')).toHaveText('Tarea creada');
    const box = await mobilePanel.boundingBox();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.x + box.width <= 390 &&
        box.y >= 0 &&
        box.y + box.height <= 844,
    );
    await phone.screenshot({
      path: screenshotDir + '/mobile-note.png',
      fullPage: true,
    });
    await phone.keyboard.press('Escape');
    await expect(mobilePanel).toBeHidden();
    await phone.reload();
    await expect(phone.getByText(mobileText, { exact: true })).toBeVisible();
    console.log('PASS mobile creation/reload, viewport containment and Escape');
    await page.goto(origin + '/admin/notas');
    await page.screenshot({
      path: screenshotDir + '/desktop-notes.png',
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      'BROWSER PASS. Signed fixture sessions; password login blocked by baseline Better Auth 1.7.2 issuer mismatch. External media blocked.',
    );
  } catch (error) {
    console.log('Browser errors:', errors);
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        console.log(
          'Page',
          page.url(),
          (await page.locator('body').ariaSnapshot()).slice(-6500),
        );
        await page.screenshot({ path: screenshotDir + '/failure.png' });
      }
    throw error;
  } finally {
    await browser.close();
    await pool.end();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
