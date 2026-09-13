import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../src/lib/db.ts';
import { env } from '../../src/lib/env.ts';
import { creatorApplications } from '../../src/db/schema/creatorApplications.ts';
import { contactSubmissions } from '../../src/db/schema/submissions.ts';
import { intakeConversations, intakeMessages } from '../../src/db/schema/creatorIntake.ts';
import { combineContacts, isSynthetic, toContact } from './model.mjs';

export async function readContacts() {
  const [applications, leads, conversations] = await Promise.all([
    db.select().from(creatorApplications).orderBy(asc(creatorApplications.createdAt)),
    db.select().from(contactSubmissions).where(inArray(contactSubmissions.type, ['talent', 'other']))
      .orderBy(asc(contactSubmissions.createdAt)),
    db.select().from(intakeConversations).where(eq(intakeConversations.channel, 'whatsapp')),
  ]);
  const rows = [];
  for (const item of applications) if (!isSynthetic(item)) rows.push(toContact({
    id: `creator:${item.id}`, createdAt: item.createdAt, name: item.name, email: item.email,
    country: item.country, content: item.contentCategory, platform: item.platform,
    handle: item.handle, otherLinks: item.otherLinks, followers: item.followers,
    average: item.averageAudience, message: item.message, origin: 'Formulario de creadores',
    crm: 'https://socialpro.es/admin/leads',
  }));
  for (const item of leads) if (!isSynthetic(item)) rows.push(toContact({
    id: `lead:${item.id}`, createdAt: item.createdAt, name: item.name, email: item.email,
    country: item.country, content: item.contentCategory, platform: item.platform,
    handle: item.channelUrl ?? item.company, otherLinks: item.otherLinks,
    followers: item.followers, average: item.averageAudience ?? item.viewers,
    message: item.message, phone: item.phone, origin: item.type === 'talent' ? 'Formulario de contacto · creador' : 'Formulario de contacto · por clasificar',
    crm: 'https://socialpro.es/admin/leads',
  }));
  // Preserve historical source IDs and exclude the pilot after identity repair.
  if (!env.CREATOR_INTAKE_WHATSAPP_CHATS) throw Error('contacts-pilot-exclusion-required');
  const excluded = env.CREATOR_INTAKE_WHATSAPP_CHATS.split(',');
  for (const item of conversations.filter((c) => !c.canonicalId && c.accountId.startsWith('waha:')
    && !excluded.includes(c.chatId.replace(/@.*$/, '')))) {
    const ids = conversations.filter((c) => c.id === item.id || c.canonicalId === item.id).map((c) => c.id);
    const messages = (await db.select().from(intakeMessages).where(inArray(intakeMessages.conversationId, ids))
      .orderBy(asc(intakeMessages.occurredAt))).filter((m) => !/^\s*\[?(?:TEST|QA|E2E)\b/i.test(m.text));
    if (!messages.some((m) => m.actor === 'creator')) continue;
    const contact = toContact({ id: `intake:${item.id}`, createdAt: item.createdAt, updatedAt: item.updatedAt,
      profile: item.profile, messages, origin: 'WhatsApp',
      phone: /^\d{7,15}(?:@c\.us)?$/.test(item.chatId) ? `+${item.chatId.replace('@c.us', '')}` : '',
      crm: `https://socialpro.es/admin/captacion?id=${item.id}`,
    });
    contact.ids = ids.map((id) => `intake:${id}`);
    rows.push(contact);
  }
  return combineContacts(rows);
}
