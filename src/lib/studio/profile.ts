import { and, eq } from "drizzle-orm";
import { studioProfiles, talentUsers } from "@/db/schema";
import { StudioProfileDocument } from "@/lib/schemas/studio-profile";
import type { StudioDatabase } from "./repository";

/** Session user only. No caller-supplied talent id; JSON is validated at the boundary. */
export async function readStudioProfile(
  database: StudioDatabase,
  userId: string,
) {
  const [row] = await database
    .select({ document: studioProfiles.document })
    .from(studioProfiles)
    .innerJoin(talentUsers, eq(talentUsers.talentId, studioProfiles.talentId))
    .where(and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)))
    .limit(1);
  const parsed = StudioProfileDocument.safeParse(row?.document);
  return parsed.success ? parsed.data : null;
}
