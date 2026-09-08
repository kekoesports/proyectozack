import 'server-only';

import { createSign } from 'node:crypto';

import { z } from 'zod';

import { env } from '@/lib/env';
import type { InboundCreatorApplication } from '@/lib/queries/inboundCreatorApplications';
import { getKickChannel } from '@/lib/services/kick';
import { getTwitchChannelInfo, searchTwitchChannels } from '@/lib/services/twitch';
import { searchYouTubeChannels } from '@/lib/services/youtube';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEET_NAME = 'Candidaturas';
const TIMEOUT_MS = 15_000;

const GoogleTokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.coerce.number().positive(),
});

const GoogleValuesResponse = z.object({
  values: z.array(z.array(z.unknown())).optional(),
});

const GoogleSpreadsheetResponse = z.object({
  sheets: z.array(z.object({
    properties: z.object({
      sheetId: z.number().int(),
      title: z.string(),
    }),
  })),
});

type Platform = 'YouTube' | 'Twitch' | 'Kick' | 'TikTok' | 'Instagram' | 'Otra';

type EnrichedApplication = {
  readonly platform: Platform;
  readonly youtubeUrl: string;
  readonly twitchUrl: string;
  readonly kickUrl: string;
  readonly otherUrls: string;
  readonly verifiedFollowers: number | null;
  readonly gameOrContent: string;
  readonly lastActivity: Date | null;
};

let cachedToken: { readonly value: string; readonly expiresAt: number } | null = null;

function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!/^(?:https?:\/\/|www\.)/i.test(trimmed)) {
    return trimmed.replace(/^@/, '').replace(/\s+/g, '');
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const segment = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
    return decodeURIComponent(segment).replace(/^@/, '').trim();
  } catch {
    return trimmed.replace(/^@/, '').replace(/\s+/g, '');
  }
}

function identityKey(value: string): string {
  return value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]/g, '');
}

function extractUrls(input: InboundCreatorApplication): string[] {
  const text = [input.declaredHandle, input.otherLinks ?? '', input.message ?? ''].join(' ');
  return [...new Set(text.match(/https?:\/\/[^\s<>()]+/gi) ?? [])]
    .map((url) => url.replace(/[),.;]+$/, ''));
}

function platformFrom(value: string): Platform {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('youtube')) return 'YouTube';
  if (normalized.includes('twitch')) return 'Twitch';
  if (normalized.includes('kick')) return 'Kick';
  if (normalized.includes('tiktok')) return 'TikTok';
  if (normalized.includes('instagram')) return 'Instagram';
  return 'Otra';
}

function inferContent(text: string): string {
  const value = text.toLowerCase();
  if (/counter[- ]?strike|\bcs2\b|\bcsgo\b/.test(value)) return 'Counter-Strike 2';
  if (/valorant/.test(value)) return 'Valorant';
  if (/minecraft/.test(value)) return 'Minecraft';
  if (/fortnite/.test(value)) return 'Fortnite';
  if (/league of legends|\blol\b/.test(value)) return 'League of Legends';
  if (/casino|slots|apuestas|igaming/.test(value)) return 'iGaming';
  if (/gaming|videojuego|streamer/.test(value)) return 'Gaming';
  if (/tecnolog|hardware|pc gaming/.test(value)) return 'Tecnología';
  if (/fútbol|futbol|deporte/.test(value)) return 'Deportes';
  return '';
}

function classifyUrls(urls: readonly string[]): Pick<EnrichedApplication, 'youtubeUrl' | 'twitchUrl' | 'kickUrl' | 'otherUrls'> {
  const youtubeUrl = urls.find((url) => /(?:youtube\.com|youtu\.be)/i.test(url)) ?? '';
  const twitchUrl = urls.find((url) => /twitch\.tv/i.test(url)) ?? '';
  const kickUrl = urls.find((url) => /kick\.com/i.test(url)) ?? '';
  const otherUrls = urls.filter((url) => ![youtubeUrl, twitchUrl, kickUrl].includes(url)).join('\n');
  return { youtubeUrl, twitchUrl, kickUrl, otherUrls };
}

async function enrichApplication(input: InboundCreatorApplication): Promise<EnrichedApplication> {
  const urls = extractUrls(input);
  const classified = classifyUrls(urls);
  const declared = input.declaredPlatform.toLowerCase() === 'cs2' ? 'Otra' : platformFrom(input.declaredPlatform);
  const detected = classified.youtubeUrl ? 'YouTube'
    : classified.twitchUrl ? 'Twitch'
      : classified.kickUrl ? 'Kick'
        : declared;
  const handle = normalizeHandle(
    detected === 'YouTube' ? classified.youtubeUrl || input.declaredHandle
      : detected === 'Twitch' ? classified.twitchUrl || input.declaredHandle
        : detected === 'Kick' ? classified.kickUrl || input.declaredHandle
          : input.declaredHandle,
  );
  const fallbackContent = input.declaredContent?.trim() || (input.declaredPlatform.toLowerCase() === 'cs2'
    ? 'Counter-Strike 2'
    : inferContent(`${input.message ?? ''} ${input.declaredHandle}`));

  try {
    if (detected === 'YouTube' && handle) {
      const channels = await searchYouTubeChannels(handle, 5, 'ES', 'es');
      const normalized = identityKey(handle);
      const channel = channels.find((item) =>
        identityKey(item.handle ?? '') === normalized || identityKey(item.title) === normalized,
      );
      if (channel) {
        return {
          platform: detected,
          ...classified,
          youtubeUrl: classified.youtubeUrl || `https://www.youtube.com/channel/${channel.channelId}`,
          verifiedFollowers: channel.subscriberCount,
          gameOrContent: inferContent(`${channel.title} ${channel.description}`) || fallbackContent,
          lastActivity: null,
        };
      }
    }
    if (detected === 'Twitch' && handle) {
      const channels = await searchTwitchChannels(handle, false);
      const normalized = identityKey(handle);
      const match = channels.find((item) => identityKey(item.login) === normalized);
      const channel = match ? (await getTwitchChannelInfo([match.broadcasterId]))[0] : null;
      if (channel) {
        return {
          platform: detected,
          ...classified,
          twitchUrl: classified.twitchUrl || `https://www.twitch.tv/${channel.login}`,
          verifiedFollowers: channel.followerCount,
          gameOrContent: channel.currentGame || fallbackContent,
          lastActivity: null,
        };
      }
    }
    if (detected === 'Kick' && handle) {
      const channel = await getKickChannel(handle);
      if (channel) {
        return {
          platform: detected,
          ...classified,
          kickUrl: classified.kickUrl || `https://kick.com/${channel.slug}`,
          verifiedFollowers: channel.followers,
          gameOrContent: channel.recentCategories[0] || fallbackContent,
          lastActivity: channel.lastLivestreamAt,
        };
      }
    }
  } catch {
    // Enriquecimiento best-effort: la candidatura se conserva aunque una API falle.
  }

  return {
    platform: detected,
    ...classified,
    verifiedFollowers: null,
    gameOrContent: fallbackContent,
    lastActivity: null,
  };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) throw new Error('missing-google-service-account');

  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3_600,
    iat: now,
  })).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(privateKey.replace(/\\n/g, '\n')).toString('base64url')}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`google-oauth-${response.status}`);
  const parsed = GoogleTokenResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error('invalid-google-oauth-response');
  cachedToken = {
    value: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1_000,
  };
  return cachedToken.value;
}

type SheetState = {
  readonly existingIds: Set<string>;
  readonly nextRow: number;
};

async function readSheetState(spreadsheetId: string, token: string): Promise<SheetState> {
  const range = encodeURIComponent(`'${SHEET_NAME}'!A5:R`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!response.ok) throw new Error(`google-sheets-read-${response.status}`);
  const parsed = GoogleValuesResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error('invalid-google-sheets-response');
  const rows = parsed.data.values ?? [];
  const existingIds = new Set(rows.flatMap((row) => {
    const value = row[0];
    return typeof value === 'string' && value ? [value] : [];
  }));
  return { existingIds, nextRow: 5 + rows.length };
}

async function getSheetId(spreadsheetId: string, token: string): Promise<number> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!response.ok) throw new Error(`google-sheets-metadata-${response.status}`);
  const parsed = GoogleSpreadsheetResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error('invalid-google-sheets-metadata-response');
  const sheet = parsed.data.sheets.find((item) => item.properties.title === SHEET_NAME);
  if (!sheet) throw new Error('creator-applications-sheet-not-found');
  return sheet.properties.sheetId;
}

async function sortSheetByNewest(
  spreadsheetId: string,
  token: string,
  sheetId: number,
  dataRowCount: number,
): Promise<void> {
  if (dataRowCount < 2) return;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          sortRange: {
            range: {
              sheetId,
              startRowIndex: 4,
              endRowIndex: 4 + dataRowCount,
              startColumnIndex: 0,
              endColumnIndex: 18,
            },
            sortSpecs: [{ dimensionIndex: 1, sortOrder: 'DESCENDING' }],
          },
        }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`google-sheets-sort-${response.status}`);
}

export type CreatorSheetSyncResult = {
  readonly discovered: number;
  readonly appended: number;
  readonly remaining: number;
};

export async function syncCreatorApplicationsToSheet(
  applications: readonly InboundCreatorApplication[],
  maxPerRun = 20,
): Promise<CreatorSheetSyncResult> {
  const spreadsheetId = env.CREATOR_APPLICATIONS_SHEET_ID;
  if (!spreadsheetId) throw new Error('missing-creator-applications-sheet-id');
  const token = await getAccessToken();
  const [{ existingIds, nextRow }, sheetId] = await Promise.all([
    readSheetState(spreadsheetId, token),
    getSheetId(spreadsheetId, token),
  ]);
  const pending = applications.filter((item) => !existingIds.has(item.sourceId));
  const selected = pending.slice(0, maxPerRun);
  const rows: unknown[][] = [];

  for (const application of selected) {
    const enriched = await enrichApplication(application);
    rows.push([
      application.sourceId,
      application.createdAt.toISOString(),
      application.name,
      application.email,
      application.country ?? '',
      enriched.gameOrContent,
      enriched.platform,
      enriched.youtubeUrl,
      enriched.twitchUrl,
      enriched.kickUrl,
      enriched.otherUrls,
      application.declaredAudience ?? '',
      enriched.verifiedFollowers ?? '',
      application.declaredAverageAudience ?? '',
      enriched.lastActivity?.toISOString().slice(0, 10) ?? '',
      'Revisar',
      '',
      '',
    ]);
  }

  if (rows.length > 0) {
    // La plantilla tiene títulos combinados sobre la tabla. Sheets puede desplazar
    // un append basado en esa tabla; una actualización con rango exacto mantiene
    // siempre el contrato A:R y permite deduplicar por el ID oculto de A.
    const lastRow = nextRow + rows.length - 1;
    const range = encodeURIComponent(`'${SHEET_NAME}'!A${nextRow}:R${lastRow}`);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ majorDimension: 'ROWS', values: rows }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`google-sheets-append-${response.status}`);
  }

  await sortSheetByNewest(spreadsheetId, token, sheetId, existingIds.size + rows.length);

  return {
    discovered: applications.length,
    appended: rows.length,
    remaining: Math.max(0, pending.length - rows.length),
  };
}
