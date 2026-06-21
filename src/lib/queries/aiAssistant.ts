import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiAssistantThreads, aiAssistantMessages, aiToolExecutions } from '@/db/schema';
import type { AiThread, AiMessage, AiThreadWithMessages } from '@/types';
import type { AiContextTypeKey } from '@/lib/schemas/aiAssistant';

// ── Threads ───────────────────────────────────────────────────────────

export async function listThreadsForUser(userId: string): Promise<readonly AiThread[]> {
  return db.select().from(aiAssistantThreads)
    .where(eq(aiAssistantThreads.userId, userId))
    .orderBy(desc(aiAssistantThreads.updatedAt))
    .limit(50);
}

export async function getThread(id: number, userId: string): Promise<AiThreadWithMessages | null> {
  const [thread] = await db.select().from(aiAssistantThreads)
    .where(and(eq(aiAssistantThreads.id, id), eq(aiAssistantThreads.userId, userId)))
    .limit(1);
  if (!thread) return null;

  const messages = await db.select().from(aiAssistantMessages)
    .where(eq(aiAssistantMessages.threadId, id))
    .orderBy(asc(aiAssistantMessages.createdAt));

  return { ...thread, messages };
}

export async function createThread(userId: string, contextType: AiContextTypeKey, title?: string): Promise<AiThread> {
  const [row] = await db.insert(aiAssistantThreads)
    .values({ userId, contextType, title: title ?? 'Nueva conversación' })
    .returning();
  if (!row) throw new Error('Failed to create thread');
  return row;
}

export async function touchThread(id: number): Promise<void> {
  await db.update(aiAssistantThreads)
    .set({ updatedAt: new Date() })
    .where(eq(aiAssistantThreads.id, id));
}

export async function updateThreadTitle(id: number, userId: string, title: string): Promise<void> {
  await db.update(aiAssistantThreads)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(aiAssistantThreads.id, id), eq(aiAssistantThreads.userId, userId)));
}

export async function deleteThread(id: number, userId: string): Promise<void> {
  await db.delete(aiAssistantThreads)
    .where(and(eq(aiAssistantThreads.id, id), eq(aiAssistantThreads.userId, userId)));
}

// ── Messages ──────────────────────────────────────────────────────────

export async function getThreadMessages(threadId: number): Promise<readonly AiMessage[]> {
  return db.select().from(aiAssistantMessages)
    .where(eq(aiAssistantMessages.threadId, threadId))
    .orderBy(asc(aiAssistantMessages.createdAt));
}

export async function insertMessage(
  threadId: number,
  role: AiMessage['role'],
  content: string,
  metadata?: Record<string, unknown>,
): Promise<AiMessage> {
  const [row] = await db.insert(aiAssistantMessages)
    .values({ threadId, role, content, metadata: metadata ?? null })
    .returning();
  if (!row) throw new Error('Failed to insert message');
  return row;
}

// ── Tool executions ───────────────────────────────────────────────────

export async function logToolExecution(opts: {
  threadId: number;
  messageId?: number;
  toolName: string;
  inputJson?: unknown;
  outputJson?: unknown;
  status: 'success' | 'error' | 'blocked';
  errorMessage?: string;
}): Promise<void> {
  await db.insert(aiToolExecutions).values({
    threadId: opts.threadId,
    messageId: opts.messageId ?? null,
    toolName: opts.toolName,
    inputJson: opts.inputJson ?? null,
    outputJson: opts.outputJson ?? null,
    status: opts.status,
    errorMessage: opts.errorMessage ?? null,
  });
}
