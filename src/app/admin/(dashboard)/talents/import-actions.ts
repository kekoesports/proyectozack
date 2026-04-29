'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { talents, talentSocials, talentVerticals } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth-guard';
import { TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';

// ── Tipos exportados ─────────────────────────────────────────────────

type TalentVertical = (typeof TALENT_VERTICALS)[number];

export type PlatformData = {
  readonly handle: string | null;
  readonly url: string | null;
  readonly followers: number | null;
  readonly followersDisplay: string;
  readonly avgViewers: number | null;
};

export type ParsedTalentRow = {
  readonly rowNumber: number;
  readonly name: string;
  readonly alias: string | null;
  readonly country: string | null;
  readonly game: string | null;
  readonly verticals: readonly TalentVertical[];
  readonly notes: string | null;
  readonly twitch: PlatformData | null;
  readonly youtube: PlatformData | null;
  readonly instagram: PlatformData | null;
  readonly tiktok: PlatformData | null;
  readonly kick: PlatformData | null;
  readonly twitter: PlatformData | null;
  readonly contactTelegram: string | null;
  readonly contactDiscord: string | null;
  readonly contactEmail: string | null;
  readonly action: 'create' | 'update' | 'review';
  readonly existingId: number | null;
  readonly existingName: string | null;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
};

export type ImportSummary = {
  readonly total: number;
  readonly create: number;
  readonly update: number;
  readonly review: number;
  readonly errors: number;
};

export type TalentImportPreview = {
  readonly rows: readonly ParsedTalentRow[];
  readonly mappedColumns: readonly { readonly original: string; readonly field: string }[];
  readonly unmappedColumns: readonly string[];
  readonly summary: ImportSummary;
  readonly error?: string;
};

export type TalentImportResult = {
  readonly created?: number;
  readonly updated?: number;
  readonly skipped?: number;
  readonly errors?: readonly string[];
  readonly success?: boolean;
};

// ── Mapa de columnas (flexible) ───────────────────────────────────────

type MappedField =
  | 'name' | 'alias' | 'country' | 'game' | 'verticals' | 'notes'
  | 'twitchHandle' | 'twitchUrl' | 'twitchFollowers' | 'twitchAvgViewers'
  | 'youtubeHandle' | 'youtubeUrl' | 'youtubeFollowers' | 'youtubeAvgViews'
  | 'instagramHandle' | 'instagramUrl' | 'instagramFollowers'
  | 'tiktokHandle' | 'tiktokUrl' | 'tiktokFollowers'
  | 'kickHandle' | 'kickUrl' | 'kickFollowers'
  | 'twitterHandle' | 'twitterUrl'
  | 'contactTelegram' | 'contactDiscord' | 'contactEmail';

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

const FIELD_MAP: Record<string, MappedField> = {
  name:'name', nombre:'name', talent:'name', talento:'name', creator:'name', influencer:'name', streamer:'name', canal:'name',
  alias:'alias', handle:'alias', usuario:'alias', username:'alias', nick:'alias',
  country:'country', pais:'country', countrycode:'country', iso:'country', codigopais:'country',
  game:'game', juego:'game', categoria:'game', category:'game',
  verticals:'verticals', verticales:'verticals', sector:'verticals', sectores:'verticals', tags:'verticals',
  notes:'notes', notas:'notes', nota:'notes', comentarios:'notes', observaciones:'notes',
  // Twitch
  twitch:'twitchHandle', twitchhandle:'twitchHandle', twitchuser:'twitchHandle', twitchcanal:'twitchHandle',
  twitchurl:'twitchUrl', urltw:'twitchUrl',
  twitchfollowers:'twitchFollowers', followerstwitch:'twitchFollowers', seguidorestwitch:'twitchFollowers', twitchsubs:'twitchFollowers',
  twitchavg:'twitchAvgViewers', avgtw:'twitchAvgViewers', twitchccv:'twitchAvgViewers',
  ccvtwitch:'twitchAvgViewers', ccv:'twitchAvgViewers', twitchaverageviewers:'twitchAvgViewers', averageviewerstwitch:'twitchAvgViewers',
  // YouTube
  youtube:'youtubeHandle', youtubehandle:'youtubeHandle', ythandle:'youtubeHandle', yt:'youtubeHandle',
  youtubeurl:'youtubeUrl', yturl:'youtubeUrl', urlyt:'youtubeUrl',
  youtubesubscribers:'youtubeFollowers', ytsubs:'youtubeFollowers', youtubesubs:'youtubeFollowers', followersyt:'youtubeFollowers',
  ytviews:'youtubeAvgViews', youtubeavgviews:'youtubeAvgViews', ytavgviews:'youtubeAvgViews', avgytviews:'youtubeAvgViews',
  // Instagram
  instagram:'instagramHandle', ig:'instagramHandle', insta:'instagramHandle',
  instagramurl:'instagramUrl', igurl:'instagramUrl', urlinstagram:'instagramUrl',
  instagramfollowers:'instagramFollowers', igfollowers:'instagramFollowers', seguidoresig:'instagramFollowers',
  // TikTok
  tiktok:'tiktokHandle', tt:'tiktokHandle', tthandle:'tiktokHandle',
  tiktokurl:'tiktokUrl', urltt:'tiktokUrl',
  tiktokfollowers:'tiktokFollowers', ttfollowers:'tiktokFollowers',
  // Kick
  kick:'kickHandle', kickhandle:'kickHandle',
  kickurl:'kickUrl', urlkick:'kickUrl',
  kickfollowers:'kickFollowers',
  // Twitter/X
  twitter:'twitterHandle', x:'twitterHandle', twitterx:'twitterHandle',
  twitterurl:'twitterUrl', xurl:'twitterUrl',
  // Contact
  telegram:'contactTelegram', tg:'contactTelegram', telegramusername:'contactTelegram',
  discord:'contactDiscord',
  email:'contactEmail', correo:'contactEmail', mail:'contactEmail',
};

// ── Helpers ───────────────────────────────────────────────────────────

function parseFollowers(val: string | null | undefined): number | null {
  if (!val) return null;
  const s = String(val).trim().replace(/\s/g, '');
  const upper = s.toUpperCase();
  const num = parseFloat(s.replace(/[KMBkmb,]/g, ''));
  if (Number.isNaN(num) || num <= 0) return null;
  if (upper.endsWith('M')) return Math.round(num * 1_000_000);
  if (upper.endsWith('K')) return Math.round(num * 1_000);
  if (upper.endsWith('B')) return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function fmtFollowers(n: number | null): string {
  if (!n || !Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('').slice(0, 4) || 'XX';
}

function parsePlatform(fields: Record<string, string>, handleKey: MappedField, urlKey: MappedField, followersKey: MappedField, avgKey: MappedField): PlatformData | null {
  const handle  = fields[handleKey]?.trim() || null;
  const url     = fields[urlKey]?.trim() || null;
  const rawF    = fields[followersKey] ?? null;
  const rawA    = fields[avgKey] ?? null;
  if (!handle && !url) return null;
  const followers = parseFollowers(rawF);
  const avgViewers = parseFollowers(rawA);
  return { handle, url, followers, followersDisplay: fmtFollowers(followers), avgViewers };
}

// ── Parser de archivo ─────────────────────────────────────────────────

async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const isXlsx = file.name.endsWith('.xlsx') || file.type.includes('spreadsheetml');
  if (isXlsx) return parseXlsx(file);
  return parseCsvFile(file);
}

async function parseXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx');
  const buf  = Buffer.from(await file.arrayBuffer());
  const wb   = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]!, { header: 1, defval: '' }) as string[][];
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0]!.map((h) => String(h ?? '').trim()).filter(Boolean);
  const rows = raw.slice(1)
    .filter((r) => r.some((c) => String(c ?? '').trim()))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = String(r[i] ?? '').trim(); });
      return obj;
    });
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

async function parseCsvFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const text    = await file.text();
  const lines   = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]!).filter(Boolean);
  const rows = lines.slice(1).map((l) => {
    const cells = parseCsvLine(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

// ── Acción: preview ───────────────────────────────────────────────────

const EMPTY_SUMMARY: ImportSummary = { total: 0, create: 0, update: 0, review: 0, errors: 0 };
const EMPTY_PREVIEW: TalentImportPreview = { rows: [], mappedColumns: [], unmappedColumns: [], summary: EMPTY_SUMMARY };

export { EMPTY_PREVIEW };

export async function previewTalentImportAction(_prev: TalentImportPreview, formData: FormData): Promise<TalentImportPreview> {
  await requireRole('admin', '/admin/login');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ...EMPTY_PREVIEW, error: 'No se ha subido ningún archivo' };
  if (file.size > 10 * 1024 * 1024) return { ...EMPTY_PREVIEW, error: 'Archivo demasiado grande (máx 10 MB)' };

  let headers: string[], rawRows: Record<string, string>[];
  try {
    ({ headers, rows: rawRows } = await parseFile(file));
  } catch (err) {
    return { ...EMPTY_PREVIEW, error: `Error al leer el archivo: ${err instanceof Error ? err.message : 'desconocido'}` };
  }
  if (rawRows.length === 0) return { ...EMPTY_PREVIEW, error: 'El archivo está vacío o no tiene datos' };

  // Mapeo de columnas
  const mappedColumns: { original: string; field: string }[] = [];
  const unmappedColumns: string[] = [];
  const headerToField: Record<string, MappedField | null> = {};
  for (const h of headers) {
    const field = FIELD_MAP[normalizeKey(h)] ?? null;
    headerToField[h] = field;
    if (field) mappedColumns.push({ original: h, field });
    else unmappedColumns.push(h);
  }

  // Carga talentos existentes para detección de duplicados
  const existing = await db.select({ id: talents.id, name: talents.name }).from(talents);
  const byNorm   = new Map(existing.map((t) => [normalizeKey(t.name), { id: t.id, name: t.name }]));

  const existingSocials = await db.select({ talentId: talentSocials.talentId, platform: talentSocials.platform, handle: talentSocials.handle }).from(talentSocials);
  const byHandle = new Map<string, number>();
  for (const s of existingSocials) {
    if (s.handle) byHandle.set(`${s.platform}:${normalizeKey(s.handle)}`, s.talentId);
  }

  // Mapea cada fila a sus campos usando la función helper
  function getField(row: Record<string, string>, field: MappedField): string {
    const entry = Object.entries(headerToField).find(([, f]) => f === field);
    return entry ? (row[entry[0]] ?? '') : '';
  }

  const rows: ParsedTalentRow[] = rawRows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = getField(row, 'name').trim();
    if (!name) { errors.push('Nombre vacío'); }
    if (name.length > 200) errors.push('Nombre demasiado largo');

    const country = getField(row, 'country').trim().toUpperCase().slice(0, 2) || null;
    const alias   = getField(row, 'alias').trim() || null;
    const game    = getField(row, 'game').trim() || null;
    const notes   = getField(row, 'notes').trim() || null;

    const verticalsRaw = getField(row, 'verticals').trim();
    const verticals: TalentVertical[] = [];
    if (verticalsRaw) {
      for (const v of verticalsRaw.split(/[|,;]/).map((s) => s.trim()).filter(Boolean)) {
        if ((TALENT_VERTICALS as readonly string[]).includes(v)) {
          verticals.push(v as TalentVertical);
        } else {
          warnings.push(`Vertical desconocido: "${v}"`);
        }
      }
    }

    const twitch   = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'twitchHandle', 'twitchUrl', 'twitchFollowers', 'twitchAvgViewers');
    const youtube  = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'youtubeHandle', 'youtubeUrl', 'youtubeFollowers', 'youtubeAvgViews');
    const instagram = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'instagramHandle', 'instagramUrl', 'instagramFollowers', 'instagramFollowers');
    const tiktok   = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'tiktokHandle', 'tiktokUrl', 'tiktokFollowers', 'tiktokFollowers');
    const kick     = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'kickHandle', 'kickUrl', 'kickFollowers', 'kickFollowers');
    const twitter  = parsePlatform(Object.fromEntries(Object.entries(row).map(([k, v]) => [headerToField[k] ?? k, v])), 'twitterHandle', 'twitterUrl', 'twitterHandle', 'twitterHandle');

    const contactTelegram = getField(row, 'contactTelegram').replace(/^@/, '').trim() || null;
    const contactDiscord  = getField(row, 'contactDiscord').trim() || null;
    const contactEmail    = getField(row, 'contactEmail').trim() || null;

    if (!twitch && !youtube && !instagram && !tiktok && !kick && !twitter) {
      warnings.push('Sin plataformas detectadas');
    }

    // Detección de duplicados
    let action: 'create' | 'update' | 'review' = 'create';
    let existingId: number | null = null;
    let existingName: string | null = null;
    const matches = new Set<number>();

    if (name) {
      const byName = byNorm.get(normalizeKey(name));
      if (byName) matches.add(byName.id);
    }
    if (twitch?.handle) { const m = byHandle.get(`twitch:${normalizeKey(twitch.handle)}`); if (m) matches.add(m); }
    if (youtube?.handle) { const m = byHandle.get(`youtube:${normalizeKey(youtube.handle)}`); if (m) matches.add(m); }
    if (instagram?.handle) { const m = byHandle.get(`instagram:${normalizeKey(instagram.handle)}`); if (m) matches.add(m); }

    if (matches.size === 1) {
      const matchId = [...matches][0]!;
      action = 'update';
      existingId = matchId;
      existingName = existing.find((t) => t.id === matchId)?.name ?? null;
    } else if (matches.size > 1) {
      action = 'review';
      warnings.push(`Posible duplicado: ${matches.size} coincidencias`);
    }

    return {
      rowNumber: i + 2, // row 1 = header
      name: name || `(fila ${i + 2})`,
      alias, country, game, verticals, notes,
      twitch, youtube, instagram, tiktok, kick, twitter,
      contactTelegram, contactDiscord, contactEmail,
      action: errors.length > 0 ? 'review' : action,
      existingId, existingName, warnings, errors,
    };
  });

  const summary: ImportSummary = {
    total:  rows.length,
    create: rows.filter((r) => r.action === 'create' && r.errors.length === 0).length,
    update: rows.filter((r) => r.action === 'update').length,
    review: rows.filter((r) => r.action === 'review' || r.errors.length > 0).length,
    errors: rows.filter((r) => r.errors.length > 0).length,
  };

  return { rows, mappedColumns, unmappedColumns, summary };
}

// ── Acción: confirmar importación ─────────────────────────────────────

const PLATFORM_HEX: Record<string, string> = {
  twitch: '#9146ff', youtube: '#ff0000', instagram: '#e1306c',
  tiktok: '#010101',  kick: '#53fc18',  twitter: '#1da1f2',
};

export async function confirmTalentImportAction(_prev: TalentImportResult, formData: FormData): Promise<TalentImportResult> {
  await requireRole('admin', '/admin/login');

  const json = formData.get('rows');
  if (typeof json !== 'string') return { errors: ['Sin datos'] };
  let rows: ParsedTalentRow[];
  try { rows = JSON.parse(json) as ParsedTalentRow[]; } catch { return { errors: ['JSON inválido'] }; }

  const toProcess = rows.filter((r) => r.errors.length === 0 && (r.action === 'create' || r.action === 'update'));
  if (toProcess.length === 0) return { errors: ['Ninguna fila válida para importar'] };

  const [maxRow] = await db.select({ max: sql<number>`COALESCE(MAX(${talents.sortOrder}), 0)` }).from(talents);
  let nextSort = (maxRow?.max ?? 0) + 1;
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of toProcess) {
    try {
      if (row.action === 'update' && row.existingId) {
        // Actualizar plataformas existentes (básico — Fase 3 hace update completo)
        const platforms: { p: string; d: PlatformData }[] = [];
        if (row.twitch)    platforms.push({ p: 'twitch',    d: row.twitch });
        if (row.youtube)   platforms.push({ p: 'youtube',   d: row.youtube });
        if (row.instagram) platforms.push({ p: 'instagram', d: row.instagram });
        if (row.tiktok)    platforms.push({ p: 'tiktok',    d: row.tiktok });
        if (row.kick)      platforms.push({ p: 'kick',      d: row.kick });
        for (const { p, d } of platforms) {
          if (!d.handle) continue;
          const existing = await db.select({ id: talentSocials.id })
            .from(talentSocials)
            .where(eq(talentSocials.talentId, row.existingId))
            .limit(1);
          if (existing.length === 0) {
            await db.insert(talentSocials).values({
              talentId: row.existingId, platform: p,
              handle: d.handle, profileUrl: d.url ?? undefined,
              followersDisplay: d.followersDisplay,
              hexColor: PLATFORM_HEX[p] ?? '#888', sortOrder: 99,
              ...(d.avgViewers !== null ? { avgViewers: d.avgViewers } : {}),
            });
          }
        }
        updated++;
      } else {
        // Crear talento nuevo
        const baseSlug = slugify(row.name);
        if (!baseSlug) { errors.push(`"${row.name}": slug vacío`); skipped++; continue; }

        const existingSlug = await db.select({ id: talents.id }).from(talents).where(eq(talents.slug, baseSlug)).limit(1);
        if (existingSlug.length > 0) { errors.push(`"${row.name}": ya existe`); skipped++; continue; }

        const primaryPlatform = row.twitch ? 'twitch' : row.youtube ? 'youtube' : 'twitch';
        const [inserted] = await db.insert(talents).values({
          slug: baseSlug, name: row.name, role: 'Creator',
          game: row.game ?? 'General',
          platform: primaryPlatform,
          status: 'inactive', bio: '',
          gradientC1: '#f5632a', gradientC2: '#8b3aad',
          initials: initials(row.name),
          sortOrder: nextSort++, visibility: 'internal',
          creatorCountry: row.country ?? undefined,
        }).returning({ id: talents.id });

        if (!inserted) { errors.push(`"${row.name}": insert falló`); skipped++; continue; }

        let socialSort = 0;
        const platforms: { p: string; d: PlatformData }[] = [];
        if (row.twitch)    platforms.push({ p: 'twitch',    d: row.twitch });
        if (row.youtube)   platforms.push({ p: 'youtube',   d: row.youtube });
        if (row.instagram) platforms.push({ p: 'instagram', d: row.instagram });
        if (row.tiktok)    platforms.push({ p: 'tiktok',    d: row.tiktok });
        if (row.kick)      platforms.push({ p: 'kick',      d: row.kick });
        if (row.twitter)   platforms.push({ p: 'twitter',   d: row.twitter });

        for (const { p, d } of platforms) {
          if (!d.handle && !d.url) continue;
          await db.insert(talentSocials).values({
            talentId: inserted.id, platform: p,
            handle: d.handle ?? d.url ?? '', profileUrl: d.url ?? undefined,
            followersDisplay: d.followersDisplay,
            hexColor: PLATFORM_HEX[p] ?? '#888', sortOrder: socialSort++,
            ...(d.avgViewers !== null ? { avgViewers: d.avgViewers } : {}),
          });
        }

        if (row.verticals.length > 0) {
          await db.insert(talentVerticals)
            .values(row.verticals.map((v) => ({ talentId: inserted.id, vertical: v })))
            .onConflictDoNothing();
        }
        created++;
      }
    } catch (err) {
      errors.push(`"${row.name}": ${err instanceof Error ? err.message : 'error desconocido'}`);
      skipped++;
    }
  }

  revalidatePath('/admin/talents');
  return { created, updated, skipped, errors, success: true };
}
