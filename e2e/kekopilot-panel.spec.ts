import { expect, test } from '@playwright/test';

for (const width of [390, 1440] as const) {
  test(`KekoPilot panel remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/kekopilot/panel');

    await expect(page.locator('[data-kp-panel-version="panel-v3"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Command Center' })).toBeVisible();
    await expect(page.getByText('Bandeja operativa')).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
}

test('filters the command center inbox', async ({ page }) => {
  await page.goto('/kekopilot/panel');
  await page.getByRole('button', { name: 'Errores', exact: true }).click();

  await expect(page.getByText('Zack Deal Clerk no completó la tarea')).toBeVisible();
  await expect(page.getByText('Emitir factura intermedia · Deal SP-1042')).toHaveCount(0);
});

test('opens a deal view and links back to its CRM record', async ({ page }) => {
  await page.goto('/kekopilot/panel');
  await page.getByRole('button', { name: /^Deals\b/ }).click();
  await page.getByRole('button', { name: /Abrir SP-1042/ }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kito Vane');
  await expect(page.getByRole('link', { name: 'Gestionar deal' }))
    .toHaveAttribute('href', '/admin/campanas/1042');
});

test('exposes working destinations for every sidebar module', async ({ page }) => {
  await page.goto('/kekopilot/panel');

  const destinations = [
    ['Talentos', '/admin/talents'],
    ['Descubrimiento', '/admin/targets'],
    ['Leads y comunicaciones', '/admin/leads'],
    ['Tareas y aprobaciones', '/admin/tareas'],
    ['Documentos', '/admin/contratos'],
    ['Automatizaciones', '/admin/automation-drafts'],
    ['Agentes', '/admin/agents'],
    ['Analítica e informes', '/admin/analytics'],
    ['Finanzas', '/admin/finanzas/resumen'],
    ['Integraciones', '/admin/entregables/fuentes'],
    ['Equipo y permisos', '/admin/equipo'],
    ['Seguridad y auditoría', '/admin/seguridad'],
    ['Configuración', '/admin/configuracion'],
  ] as const;

  for (const [name, href] of destinations) {
    await expect(page.getByRole('link', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) }))
      .toHaveAttribute('href', href);
  }
});
