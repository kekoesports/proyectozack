import { z } from "zod";

const ShortText = z.string().trim().min(1).max(300);
const Source = z.object({
  label: ShortText,
  kind: z.enum(["owner", "public_case", "production_record"]),
  date: z.iso.date(),
  url: z
    .url()
    .refine((value) => new URL(value).protocol === "https:", "Solo HTTPS")
    .optional(),
});

export const StudioProfileDocument = z.object({
  version: z.literal(1),
  higgsfieldVoice: z.object({ id: z.uuid(), name: z.string().min(1).max(100), verifiedAt: z.iso.datetime() }).optional(),
  displayName: ShortText,
  role: ShortText,
  bio: z.string().trim().min(1).max(1500),
  pronunciation: z.string().trim().min(1).max(1000),
  voiceStatus: z.enum(["reference_only", "approved_external"]),
  usageScope: z.string().trim().min(1).max(1000),
  portraitAssetId: z.uuid().nullable(),
  voiceAssetId: z.uuid().nullable(),
  approvedVideoAssetId: z.uuid().nullable(),
  logoAssetId: z.uuid().nullable(),
  guidelines: z.array(ShortText).max(20),
  team: z.array(z.object({ name: ShortText, role: ShortText })).max(30),
  currentCreators: z.array(ShortText).max(100),
  collaborators: z.array(ShortText).max(100),
  sources: z.array(Source).min(1).max(20),
  cases: z
    .array(
      z.object({
        title: ShortText,
        summary: z.string().trim().min(1).max(1500),
        source: Source.extend({
          kind: z.literal("public_case"),
          url: z.url().startsWith("https://"),
        }),
      }),
    )
    .max(20),
  publicationNotes: z.string().max(4000),
});
export type StudioProfileDocument = z.infer<typeof StudioProfileDocument>;
