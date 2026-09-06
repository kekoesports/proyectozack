import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { talents } from "./talents";
import { user } from "./auth";

/** Private editorial context, not provider credentials or a trained model. */
export const studioProfiles = pgTable("studio_profiles", {
  talentId: integer("talent_id")
    .primaryKey()
    .references(() => talents.id, { onDelete: "restrict" }),
  document: jsonb("document").notNull(),
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
