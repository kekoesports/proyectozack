import { inArray } from "drizzle-orm";
import { studioProfiles } from "@/db/schema";
import { StudioProfileDocument } from "@/lib/schemas/studio-profile";
import type { StudioDatabase } from "./repository";
import { visibleStudioTalents } from './talent-scope';

/** Session actor plus a narrowing selection; roles/membership are checked in SQL. */
export async function readStudioProfile(
  database: StudioDatabase,
  userId: string,
  agencyTalentId?: number,
) {
  const [row] = await database
    .select({ document: studioProfiles.document })
    .from(studioProfiles)
    .where(inArray(studioProfiles.talentId, visibleStudioTalents(database, userId, agencyTalentId)))
    .limit(1);
  const parsed = StudioProfileDocument.safeParse(row?.document);
  return parsed.success ? parsed.data : null;
}
