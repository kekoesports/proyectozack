import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { closeDbPool } from '@/lib/db';
import { syncGithubIpEvidence } from '@/lib/services/ipEvidenceGithubSync';
import { syncGithubCommitEvidence } from '@/lib/services/ipEvidenceCommitSync';

const secret = env.CRON_SECRET;
if (!secret) throw new Error('IP collector requires CRON_SECRET');
let busy = false;
async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Content-Type', 'application/json');
  const supplied = Buffer.from(request.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    response.writeHead(401).end('{"error":"unauthorized"}'); return;
  }
  if (request.url !== '/api/cron/sync-ip-evidence' || request.method !== 'GET') {
    response.writeHead(404).end('{"error":"not_found"}'); return;
  }
  if (busy) { response.writeHead(409).end('{"error":"sync_in_progress"}'); return; }
  busy = true;
  try {
    const pulls = await syncGithubIpEvidence();
    const commits = await syncGithubCommitEvidence();
    const result = { observedAt: new Date().toISOString(), pulls, commits };
    console.log(JSON.stringify(result));
    response.writeHead(pulls.errors || commits.errors ? 502 : 200).end(JSON.stringify(result));
  } catch {
    response.writeHead(500).end('{"error":"sync_failed"}');
  } finally { busy = false; }
}
const server = createServer((request, response) => {
  void handleRequest(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end('{"error":"request_failed"}');
  });
});
server.requestTimeout = 120_000;
server.listen(3001, '0.0.0.0');
process.on('SIGTERM', () => { server.close(() => { void closeDbPool().then(() => process.exit(0)); }); });
