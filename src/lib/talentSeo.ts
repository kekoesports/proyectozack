import { getCountryLabel } from '@/lib/countries';
import { truncateMetaDescription } from '@/lib/utils/text';
import { parseFollowers } from '@/lib/utils/format';

type TalentSeoSocial = {
  readonly platform: string;
  readonly followersDisplay: string | null;
  readonly sortOrder?: number;
};

export type TalentSeoInput = {
  readonly name: string;
  readonly role: string;
  readonly game: string;
  readonly platform: string;
  readonly creatorCountry?: string | null;
  readonly socials?: readonly TalentSeoSocial[];
};

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  discord: 'Discord',
  instagram: 'Instagram',
  kick: 'Kick',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  x: 'X',
  youtube: 'YouTube',
};

const PLATFORM_ALIASES: Readonly<Record<string, string>> = {
  tw: 'twitch',
  twitter: 'x',
  yt: 'youtube',
};

const PLATFORM_PRIORITY: Readonly<Record<string, number>> = {
  twitch: 0,
  youtube: 1,
  kick: 2,
  tiktok: 3,
  instagram: 4,
  x: 5,
  discord: 6,
};

function normalizePlatform(platform: string): string {
  const normalized = platform.trim().toLowerCase();
  return PLATFORM_ALIASES[normalized] ?? normalized;
}

function normalizeGame(game: string): string {
  const trimmed = game.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || ['content creator', 'creator', 'general'].includes(normalized)) return '';
  if (['cs2', 'counter-strike 2', 'counter strike 2'].includes(normalized)) return 'CS2';
  if (normalized === 'gta') return 'GTA';
  if (normalized === 'valorant') return 'Valorant';
  if (['cod', 'call of duty'].includes(normalized)) return 'Call of Duty';

  return trimmed;
}

function normalizeRole(role: string): string {
  const trimmed = role.trim();
  const normalized = trimmed.toLowerCase();

  if (/\b(pro player|jugador profesional)\b/i.test(trimmed)) return 'Jugador profesional';
  if (/\bstreamer\b/i.test(trimmed)) return 'Streamer';
  if (/\byoutuber\b/i.test(trimmed)) return 'YouTuber';
  if (/\b(content creator|creador(?:a)? de contenido|creator)\b/i.test(trimmed)) return 'Creador de contenido';

  if (!trimmed) return 'Creador de contenido';
  return normalized === trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function buildRoleAndGame(talent: Pick<TalentSeoInput, 'role' | 'game'>): string {
  const role = normalizeRole(talent.role);
  const game = normalizeGame(talent.game);
  if (!game || role.toLowerCase().includes(game.toLowerCase())) return role;
  return `${role} de ${game}`;
}

function lowercaseFirst(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toLocaleLowerCase('es')}${value.slice(1)}`;
}

function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return getCountryLabel(code.trim().toUpperCase()) ?? null;
}

function hasFollowerValue(value: string | null): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized !== '-' && normalized !== '0' && /[1-9]/.test(normalized);
}

function followerHighlights(talent: TalentSeoInput): string[] {
  const primaryPlatform = normalizePlatform(talent.platform);
  const bestByPlatform = new Map<string, TalentSeoSocial>();

  for (const social of talent.socials ?? []) {
    if (!hasFollowerValue(social.followersDisplay)) continue;
    const platform = normalizePlatform(social.platform);
    const current = bestByPlatform.get(platform);
    if (!current || parseFollowers(social.followersDisplay) > parseFollowers(current.followersDisplay ?? '')) {
      bestByPlatform.set(platform, social);
    }
  }

  const socials = [...bestByPlatform.values()].sort((a, b) => {
    const aPlatform = normalizePlatform(a.platform);
    const bPlatform = normalizePlatform(b.platform);
    const aPrimary = aPlatform === primaryPlatform ? 0 : 1;
    const bPrimary = bPlatform === primaryPlatform ? 0 : 1;
    if (aPrimary !== bPrimary) return aPrimary - bPrimary;
    const platformOrder = (PLATFORM_PRIORITY[aPlatform] ?? 99) - (PLATFORM_PRIORITY[bPlatform] ?? 99);
    if (platformOrder !== 0) return platformOrder;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const highlights: string[] = [];

  for (const social of socials) {
    const platform = normalizePlatform(social.platform);
    if (!hasFollowerValue(social.followersDisplay)) continue;
    highlights.push(`${social.followersDisplay.trim()} seguidores en ${PLATFORM_LABELS[platform] ?? social.platform}`);
    if (highlights.length === 2) break;
  }

  return highlights;
}

/** Removes one or more accidental brand suffixes; the root layout owns the brand template. */
export function stripSocialProSuffix(title: string): string {
  return title
    .trim()
    .replace(/(?:\s*(?:\||—|-)\s*SocialPro)+\s*$/i, '')
    .trim();
}

/** Search-oriented base title. The root layout appends exactly one `| SocialPro`. */
export function buildTalentSearchTitle(talent: TalentSeoInput): string {
  return stripSocialProSuffix(`${talent.name.trim()} — ${buildRoleAndGame(talent)}`);
}

/** Dynamic description sourced from current talent and social rows, never hardcoded metrics. */
export function buildTalentMetaDescription(talent: TalentSeoInput): string {
  const country = countryName(talent.creatorCountry);
  const subject = `${talent.name.trim()} es ${lowercaseFirst(buildRoleAndGame(talent))}${country ? ` de ${country}` : ''}`;
  const followers = followerHighlights(talent);
  const metrics = followers.length > 0 ? `, con ${followers.join(' y ')}` : '';
  const description = `${subject}${metrics}. Perfil representado por SocialPro.`;

  return truncateMetaDescription(description) ?? `${talent.name.trim()}, perfil representado por SocialPro.`;
}

/** Descriptive portrait alt text using only verified talent fields. */
export function buildTalentImageAlt(talent: TalentSeoInput): string {
  const country = countryName(talent.creatorCountry);
  const descriptor = lowercaseFirst(buildRoleAndGame(talent));
  return `Perfil de ${talent.name.trim()}, ${descriptor}${country ? ` de ${country}` : ''}, representado por SocialPro`;
}
