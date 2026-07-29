import { expect, test } from '@playwright/test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  giveaways,
  playerProfiles,
  redemptions,
  shopItems,
  talents,
  user,
} from '@/db/schema';

test.describe.configure({ mode: 'serial' });

const runKey = `e2e-sorteos-${Date.now()}`;
const email = `${runKey}@example.invalid`;
const credential = `Qa!${crypto.randomUUID()}Z9`;
const createdTalentIds: number[] = [];
let giveawayId: number;
let shopItemId: number;
let userId: string | null = null;

async function ensureTalent(slug: 'zacketizor' | 'huasopeek', name: string): Promise<number> {
  const existing = await db.query.talents.findFirst({
    where: eq(talents.slug, slug),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const [created] = await db.insert(talents).values({
    slug,
    name,
    role: 'Creador QA',
    game: 'CS2',
    platform: 'twitch',
    bio: 'Fixture E2E de sorteos',
    gradientC1: '#111111',
    gradientC2: '#222222',
    initials: name.slice(0, 2).toUpperCase(),
    isPublished: true,
  }).returning({ id: talents.id });
  if (!created) throw new Error(`No se pudo crear el talent ${slug}`);
  createdTalentIds.push(created.id);
  return created.id;
}

test.beforeAll(async () => {
  await ensureTalent('zacketizor', 'Zacketizor QA');
  const huasoId = await ensureTalent('huasopeek', 'Huasopeek QA');
  const now = Date.now();

  const [giveaway] = await db.insert(giveaways).values({
    talentId: huasoId,
    title: `Skin E2E ${runKey}`,
    brandName: 'QA',
    value: '100 puntos',
    redirectUrl: '/sorteos/huasopeek',
    startsAt: new Date(now - 60_000),
    endsAt: new Date(now + 3_600_000),
    entryAwardCoins: 20,
    status: 'active',
  }).returning({ id: giveaways.id });
  if (!giveaway) throw new Error('No se pudo crear el sorteo E2E');
  giveawayId = giveaway.id;

  const [item] = await db.insert(shopItems).values({
    category: 'skin',
    name: `Skin canje E2E ${runKey}`,
    description: 'Fixture de canje de extremo a extremo',
    costCoins: 100,
    stock: 1,
    isActive: true,
    sortOrder: -999,
  }).returning({ id: shopItems.id });
  if (!item) throw new Error('No se pudo crear el item E2E');
  shopItemId = item.id;
});

test.afterAll(async () => {
  const qaUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });
  if (qaUser) await db.delete(user).where(eq(user.id, qaUser.id));
  if (giveawayId) await db.delete(giveaways).where(eq(giveaways.id, giveawayId));
  if (shopItemId) await db.delete(shopItems).where(eq(shopItems.id, shopItemId));
  if (createdTalentIds.length > 0) {
    await db.delete(talents).where(inArray(talents.id, createdTalentIds));
  }
});

test('anónimo no recibe códigos ni CTA de partners externos', async ({ page }) => {
  await page.goto('/sorteos/zacketizor', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Inicia sesión con Steam para ver las ofertas de partners')).toBeVisible();
  await expect(page.locator('a[href*="key-drop"], a[href*="keydrop"], a[href*="csgo-skins"]')).toHaveCount(0);
});

test('usuario confirma +18, participa y canjea una única recompensa', async ({ page }) => {
  const signUp = await page.request.post('/api/auth/sign-up/email', {
    data: { name: 'ZAC QA', email, password: credential },
  });
  expect(signUp.ok()).toBeTruthy();

  await expect.poll(async () => Boolean(await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  }))).toBe(true);
  const qaUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });
  if (!qaUser) throw new Error('Better Auth no creó el usuario E2E');
  userId = qaUser.id;

  await db.insert(playerProfiles).values({
    userId: qaUser.id,
    steamId: runKey,
    steamTradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456&token=QAToken12',
    isPrivate: false,
  });
  await db.insert(coinTransactions).values({
    userId: qaUser.id,
    amount: 80,
    source: 'admin',
    concept: 'Saldo fixture E2E',
    refKey: `${runKey}:balance`,
  });

  await page.goto('/sorteos/huasopeek', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Confirma tu edad' })).toBeVisible();
  await page.getByText('Confirmo que soy mayor de').click();
  await page.getByRole('button', { name: 'Confirmar +18' }).click();
  await expect(page.getByRole('heading', { name: 'Confirma tu edad' })).toBeHidden();

  const giveawayCard = page.locator('article').filter({ hasText: `Skin E2E ${runKey}` });
  await giveawayCard.getByRole('button', { name: 'Participa gratis' }).click();
  await expect(giveawayCard.getByRole('button', { name: /Inscrito/ })).toBeVisible();

  const itemCard = page.locator('.gp-shop-card').filter({ hasText: `Skin canje E2E ${runKey}` });
  await expect(itemCard.getByRole('button', { name: 'Canjear' })).toBeEnabled();
  await itemCard.getByRole('button', { name: 'Canjear' }).click();
  await expect(page.locator('.gp-shop-success')).toContainText('Solicitud recibida');

  await expect.poll(async () => {
    if (!userId) return 0;
    const rows = await db.query.redemptions.findMany({
      where: eq(redemptions.userId, userId),
    });
    return rows.length;
  }).toBe(1);

  await page.goto('/sorteos/zacketizor', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Confirmar y ver ofertas' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const checkbox of await dialog.getByRole('checkbox').all()) {
    await checkbox.check();
  }
  await dialog.getByRole('button', { name: 'Aceptar y continuar' }).click();

  await expect(page.getByText('Ofertas externas no disponibles en tu región.')).toBeVisible();
  await expect(page.locator('a[href*="key-drop"], a[href*="keydrop"], a[href*="csgo-skins"]')).toHaveCount(0);
});
