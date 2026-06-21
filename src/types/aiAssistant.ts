import type { InferSelectModel } from 'drizzle-orm';
import type { aiAssistantThreads, aiAssistantMessages, aiToolExecutions } from '@/db/schema';

export type AiThread = InferSelectModel<typeof aiAssistantThreads>;
export type AiMessage = InferSelectModel<typeof aiAssistantMessages>;
export type AiToolExecution = InferSelectModel<typeof aiToolExecutions>;

export type AiContextType = NonNullable<AiThread['contextType']>;
export type AiMessageRole = AiMessage['role'];
export type AiToolStatus = AiToolExecution['status'];

export type AiThreadWithMessages = AiThread & {
  readonly messages: readonly AiMessage[];
};
