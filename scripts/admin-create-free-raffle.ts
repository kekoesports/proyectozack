/**
 * scripts/admin-create-free-raffle.ts
 *
 * Crea un sorteo GRATIS interno (entry_award_coins=0, status='active').
 *
 * Uso local:
 *   CONFIRM_CREATE_FREE_RAFFLE=I_ACCEPT_CREATE_FREE_RAFFLE \
 *   npx tsx scripts/admin-create-free-raffle.ts \
 *     --creator-slug zacketizor \
 *     --title "Sorteo gratis · AK-47 | Redline" \
 *     --reward-name "AK-47 | Redline" \
 *     --reward-image-url "https://cdn.example.com/ak-redline.png" \
 *     --ends-at "2026-07-31T23:59:00Z"
 *
 * ⚠️ Windows / Git Bash: MSYS convierte cualquier argumento que empiece
 * con `/` a un path absoluto Windows ("C:/Program Files/Git/..."). Si
 * pasas `--reward-image-url "/images/rewards/foo.png"` directamente desde
 * Git Bash, el valor guardado será inservible. Dos workarounds:
 *   (a) Ejecutar con MSYS_NO_PATHCONV=1 delante:
 *       MSYS_NO_PATHCONV=1 CONFIRM_CREATE_FREE_RAFFLE=... npx tsx ...
 *   (b) Doble slash: `--reward-image-url "//images/rewards/foo.png"`
 *       (MSYS respeta el doble slash y no lo convierte).
 * PowerShell/CMD no tienen este problema — funciona con `/` directo.
 *
 * Reglas del script:
 *   1. Sin CONFIRM_CREATE_FREE_RAFFLE=I_ACCEPT_CREATE_FREE_RAFFLE → abort.
 *   2. NO tocar producción sin OK del owner.
 *   3. Crea SIEMPRE con entry_award_coins=0 (nunca da puntos por participar).
 *   4. Idempotencia manual: reejecutar con el mismo título crea un duplicado.
 *      Usar `list` para revisar antes.
 *
 * El script no borra ni edita — solo crea. Para editar/borrar → panel admin.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

interface Args {
  creatorSlug?: string;
  title?: string;
  rewardName?: string;
  rewardImageUrl?: string;
  endsAt?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) continue;
    switch (key) {
      case 'creator-slug':      out.creatorSlug     = value; i++; break;
      case 'title':             out.title           = value; i++; break;
      case 'reward-name':       out.rewardName      = value; i++; break;
      case 'reward-image-url':  out.rewardImageUrl  = value; i++; break;
      case 'ends-at':           out.endsAt          = value; i++; break;
    }
  }
  return out;
}

async function main() {
  const GUARD = 'I_ACCEPT_CREATE_FREE_RAFFLE';
  if (process.env.CONFIRM_CREATE_FREE_RAFFLE !== GUARD) {
    console.error(
      `❌ Bloqueado.\n\nPara ejecutar, define:\n  CONFIRM_CREATE_FREE_RAFFLE=${GUARD}\n\n` +
      `Comando completo:\n  CONFIRM_CREATE_FREE_RAFFLE=${GUARD} npx tsx scripts/admin-create-free-raffle.ts \\\n` +
      `    --creator-slug zacketizor \\\n` +
      `    --title "Sorteo gratis · AK-47 | Redline" \\\n` +
      `    --reward-name "AK-47 | Redline" \\\n` +
      `    --reward-image-url "https://cdn.example.com/ak-redline.png" \\\n` +
      `    --ends-at "2026-07-31T23:59:00Z"\n`,
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const missing: string[] = [];
  if (!args.creatorSlug)    missing.push('--creator-slug');
  if (!args.title)          missing.push('--title');
  if (!args.rewardName)     missing.push('--reward-name');
  if (!args.rewardImageUrl) missing.push('--reward-image-url');
  if (!args.endsAt)         missing.push('--ends-at');
  if (missing.length > 0) {
    console.error(`❌ Faltan args: ${missing.join(', ')}`);
    process.exit(1);
  }

  const endsAtDate = new Date(args.endsAt!);
  if (isNaN(endsAtDate.getTime())) {
    console.error(`❌ --ends-at inválido: "${args.endsAt}". Usa ISO 8601 (ej. 2026-07-31T23:59:00Z).`);
    process.exit(1);
  }
  if (endsAtDate <= new Date()) {
    console.error(`❌ --ends-at está en el pasado. Especifica una fecha futura.`);
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL no definida (revisa .env.local).');
    process.exit(1);
  }
  const sql = neon(url);

  // Resolvemos talent_id desde el slug.
  const talentRows = await sql`
    SELECT id, name, slug FROM talents WHERE slug = ${args.creatorSlug} LIMIT 1
  `;
  const talent = talentRows[0] as { id: number; name: string; slug: string } | undefined;
  if (!talent) {
    console.error(`❌ Talent con slug "${args.creatorSlug}" no encontrado.`);
    process.exit(1);
  }

  console.log(`Creador: ${talent.name} (id=${talent.id}, slug=${talent.slug})`);
  console.log(`Título:  ${args.title}`);
  console.log(`Reward:  ${args.rewardName}`);
  console.log(`Imagen:  ${args.rewardImageUrl}`);
  console.log(`Ends at: ${endsAtDate.toISOString()}`);
  console.log('');

  const now = new Date();
  const redirectUrl = `/sorteos/${talent.slug}#recompensas`;

  const inserted = await sql`
    INSERT INTO giveaways (
      talent_id, title, description, image_url,
      brand_name, brand_logo, value, redirect_url,
      starts_at, ends_at,
      is_featured, badge, sort_order,
      entry_award_coins, status,
      created_at, updated_at
    ) VALUES (
      ${talent.id}, ${args.title}, NULL, ${args.rewardImageUrl},
      'SocialPro', NULL, ${args.rewardName}, ${redirectUrl},
      ${now.toISOString()}, ${endsAtDate.toISOString()},
      false, NULL, 0,
      0, 'active',
      ${now.toISOString()}, ${now.toISOString()}
    )
    RETURNING id
  `;

  const row = inserted[0] as { id: number } | undefined;
  if (!row) {
    console.error('❌ No se pudo insertar. Nada devuelto.');
    process.exit(1);
  }

  console.log(`✅ Sorteo gratis creado #${row.id}`);
  console.log(`   Ver en: https://socialpro.es/sorteos/${talent.slug}#recompensas`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
