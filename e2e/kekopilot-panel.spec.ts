import { expect, test } from '@playwright/test';

for (const width of [390, 1440] as const) {
  test(`KekoPilot panel remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/kekopilot/panel');

    await expect(page.getByRole('heading', { level: 1, name: 'Command Center' })).toBeVisible();
    await expect(page.getByText('Bandeja unificada')).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
}

test('filters the command center inbox', async ({ page }) => {
  await page.goto('/kekopilot/panel');
  await page.getByRole('button', { name: 'Errores', exact: true }).click();

  await expect(page.getByText('Zack Deal Clerk · ejecución 8')).toBeVisible();
  await expect(page.getByText('Emitir factura intermedia · Deal SP-1042')).toHaveCount(0);
});

test('opens a real-data deal view and links back to the canonical CRM record', async ({ page }) => {
  await page.goto('/kekopilot/panel');
  await page.getByRole('button', { name: 'Pipeline', exact: true }).click();
  await page.getByRole('button', { name: /Abrir SP-1042/ }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kito Vane');
  await expect(page.getByRole('link', { name: 'Abrir ficha completa en SocialPro' }))
    .toHaveAttribute('href', '/admin/campanas/1042');
});

test('exposes the product architecture and permission model', async ({ page }) => {
  await page.goto('/kekopilot/panel');
  await page.getByRole('button', { name: 'Arquitectura', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Arquitectura del panel' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('De conversación a deal')).toBeVisible();
});
