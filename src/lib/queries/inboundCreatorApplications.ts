import { asc, eq } from 'drizzle-orm';

import { creatorApplications, contactSubmissions } from '@/db/schema';
import { db } from '@/lib/db';

export type InboundCreatorApplication = {
  readonly sourceId: string;
  readonly createdAt: Date;
  readonly name: string;
  readonly email: string;
  readonly declaredPlatform: string;
  readonly declaredHandle: string;
  readonly declaredAudience: string | null;
  readonly message: string | null;
};

/**
 * Une los dos formularios que aceptan candidaturas de creadores. El ID lleva
 * prefijo de origen para que la sincronización con Sheets sea idempotente.
 */
export async function listInboundCreatorApplications(): Promise<InboundCreatorApplication[]> {
  const [applications, leads] = await Promise.all([
    db.select().from(creatorApplications).orderBy(asc(creatorApplications.createdAt)),
    db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.type, 'talent'))
      .orderBy(asc(contactSubmissions.createdAt)),
  ]);

  return [
    ...applications.map((item) => ({
      sourceId: `creator:${item.id}`,
      createdAt: item.createdAt,
      name: item.name,
      email: item.email,
      declaredPlatform: item.platform,
      declaredHandle: item.handle,
      declaredAudience: item.followers,
      message: item.message,
    })),
    ...leads.map((item) => ({
      sourceId: `lead:${item.id}`,
      createdAt: item.createdAt,
      name: item.name,
      email: item.email,
      declaredPlatform: item.platform ?? '',
      declaredHandle: item.company ?? '',
      declaredAudience: item.viewers,
      message: item.message,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
