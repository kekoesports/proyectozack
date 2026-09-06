import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { env } from '@/lib/env';
const exec = promisify(execFile);
const inputSchema = z.object({ text: z.string().trim().min(10).max(5000), voiceId: z.uuid() });
const quoteSchema = z.object({ credits: z.number().finite().min(0).max(500) });
const jobSchema = z.object({ id: z.uuid(), status: z.string(), result_url: z.url().nullable() });
const jobsSchema = z.union([jobSchema, z.array(jobSchema).length(1)]);
async function command(args: string[], timeout: number): Promise<unknown> {
  if (!env.STUDIO_HIGGSFIELD_ENABLED || !env.STUDIO_HIGGSFIELD_BIN) throw new Error('higgsfield_not_configured');
  // Native binary; no shell, token extraction, arbitrary command, model or user media URL.
  const result = await exec(env.STUDIO_HIGGSFIELD_BIN, args, { windowsHide: true, timeout, maxBuffer: 1024 * 1024 });
  return JSON.parse(result.stdout) as unknown;
}
function parameters(input: { text: string; voiceId: string }) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new Error('invalid_narration');
  return ['text2speech_v2', '--prompt', parsed.data.text, '--variant', 'elevenlabs', '--voice_type', 'element', '--voice_id', parsed.data.voiceId];
}
export async function quoteHiggsfieldNarration(input: { text: string; voiceId: string }) {
  const parsed = quoteSchema.safeParse(await command(['generate', 'cost', ...parameters(input), '--json'], 25000));
  if (!parsed.success) throw new Error('invalid_quote');
  return Math.ceil(parsed.data.credits * 1000);
}
export async function generateHiggsfieldNarration(input: { text: string; voiceId: string }) {
  // Only the worker calls this after a persisted, unexpired, revision-bound agency approval.
  const parsed = jobsSchema.safeParse(await command(['generate', 'create', ...parameters(input), '--wait', '--wait-timeout', '10m', '--json'], 660000));
  if (!parsed.success) throw new Error('uncertain_provider_result');
  const job = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
  if (!job || job.status !== 'completed' || !job.result_url) throw new Error('uncertain_provider_result');
  const url = new URL(job.result_url);
  // Verified provider output hosts only, redirects disabled. This cannot fetch arbitrary model-generated URLs.
  if (url.protocol !== 'https:' || !['d8j0ntlcm91z4.cloudfront.net', 'd2ol7oe51mr4n9.cloudfront.net'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('untrusted_provider_result');
  return { id: job.id, url: url.href };
}
