/** Private, verified phone identities only. Group/LID IDs never grant reply scope. */
export function canReplyToWahaChat(chatId: string, config: {
  phone?: string | undefined; chats?: string | undefined; replyToInbound?: boolean | undefined;
}): boolean {
  return /^[1-9]\d{6,14}$/.test(chatId) && chatId !== config.phone
    && (config.replyToInbound === true || Boolean(config.chats?.split(',').includes(chatId)));
}
