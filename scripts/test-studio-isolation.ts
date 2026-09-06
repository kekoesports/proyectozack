/** In-memory PostgreSQL only. Never loads env files or connects to network DBs. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { createStudioRepository } from "../src/lib/studio/repository";
import {
  issueStudioInvitation,
  acceptStudioInvitation,
  invitationHash,
} from "../src/lib/studio/invitations";
import {
  reviewStudioProject,
  revokeStudioMember,
} from "../src/lib/studio/agency";
import { StudioProjectInput } from "../src/lib/schemas/studio";

async function main() {
  const pg = new PGlite();
  const database = drizzle(pg, { schema });
  let checks = 0;
  const check = (condition: unknown, label: string) => {
    assert.ok(condition, label);
    checks++;
  };
  try {
    const newTables = new Set([
      "talentUsers",
      "studioInvitations",
      "studioProjects",
      "studioVersions",
      "studioAssets",
      "studioReviews",
      "studioProfiles",
      "studioBoards", "studioChatTurns", "studioRenders", "studioChannels", "studioChannelObservations", "studioSchedule",
      "studioNarrations",
    ]);
    const baseline = Object.fromEntries(
      Object.entries(schema).filter(([key]) => !newTables.has(key)),
    );
    const statements = await generateMigration(
      generateDrizzleJson({}),
      generateDrizzleJson(baseline),
    );
    for (const statement of statements) await pg.exec(statement);
    // Exercise the actual generated migration, on generated baseline, not raw handmade DDL.
    await pg.exec(
      await readFile("drizzle/0151_studio_creator_portal.sql", "utf8"),
    );
    check(true, "migration applied to isolated baseline");
    await pg.exec(
      await readFile("drizzle/0152_studio_private_profiles.sql", "utf8"),
    );
    check(true, "profile migration applied to isolated baseline");
    await pg.exec(await readFile('drizzle/0153_studio_production_workspace.sql', 'utf8'));
    check(true, 'production migration applied to isolated baseline');
    await pg.exec(await readFile('drizzle/0154_studio_narration_approvals.sql', 'utf8'));
    check(true, 'narration migration applied to isolated baseline');
    const now = new Date();
    await database.insert(schema.user).values(
      ["agency", "a", "b", "c"].map((id) => ({
        id: `studio-test-${id}`,
        name: `Fixture ${id}`,
        email: `${id}@studio.test`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        role: id === "agency" ? "admin" : null,
      })),
    );
    const talents = await database
      .insert(schema.talents)
      .values(
        ["a", "b"].map((id) => ({
          slug: `studio-test-${id}`,
          name: `Fixture ${id}`,
          role: "Creator",
          game: "CS2",
          platform: "youtube" as const,
          bio: "Isolated QA",
          gradientC1: "#e03070",
          gradientC2: "#8b3aad",
          initials: id,
        })),
      )
      .returning();
    const aTalent = talents[0];
    const bTalent = talents[1];
    assert.ok(aTalent && bTalent);
    const tokenA = await issueStudioInvitation(
      database,
      aTalent.id,
      "a@studio.test",
      "studio-test-agency",
    );
    const tokenB = await issueStudioInvitation(
      database,
      bTalent.id,
      "b@studio.test",
      "studio-test-agency",
    );
    await database
      .update(schema.user)
      .set({ emailVerified: false })
      .where(eq(schema.user.id, "studio-test-a"));
    check(
      !(await acceptStudioInvitation(
        database,
        tokenA,
        "studio-test-a",
        "a@studio.test",
      )),
      "unverified account rejected even with invite",
    );
    await database
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, "studio-test-a"));
    check(
      !(await acceptStudioInvitation(
        database,
        tokenA,
        "studio-test-b",
        "b@studio.test",
      )),
      "wrong account rejected",
    );
    check(
      await acceptStudioInvitation(
        database,
        tokenA,
        "studio-test-a",
        "a@studio.test",
      ),
      "matching invite accepted",
    );
    check(
      !(await acceptStudioInvitation(
        database,
        tokenA,
        "studio-test-a",
        "a@studio.test",
      )),
      "invite replay rejected",
    );
    check(
      await acceptStudioInvitation(
        database,
        tokenB,
        "studio-test-b",
        "b@studio.test",
      ),
      "second creator accepted",
    );
    const expired = await issueStudioInvitation(
      database,
      aTalent.id,
      "c@studio.test",
      "studio-test-agency",
    );
    await database
      .update(schema.studioInvitations)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.studioInvitations.tokenHash, invitationHash(expired)));
    check(
      !(await acceptStudioInvitation(
        database,
        expired,
        "studio-test-c",
        "c@studio.test",
      )),
      "expired invite rejected",
    );
    const a = createStudioRepository(database, "studio-test-a");
    const b = createStudioRepository(database, "studio-test-b");
    const outsider = createStudioRepository(database, "studio-test-c");
    await database.insert(schema.studioProfiles).values({
      talentId: aTalent.id,
      recordedBy: "studio-test-agency",
      document: {
        version: 1,
        displayName: "Private A",
        role: "Creator",
        bio: "Synthetic",
        pronunciation: "Original audio",
        voiceStatus: "reference_only",
        usageScope: "A only",
        portraitAssetId: null,
        voiceAssetId: null,
        approvedVideoAssetId: null,
        logoAssetId: null,
        guidelines: [],
        team: [],
        currentCreators: [],
        collaborators: [],
        cases: [],
        sources: [{ label: "Fixture", kind: "owner", date: "2026-09-06" }],
        publicationNotes: "",
      },
    });
    check(
      (await a.profile())?.displayName === "Private A",
      "owner can read private identity",
    );
    check(
      (await b.profile()) === null,
      "other creator cannot read private identity",
    );
    check(
      (await outsider.profile()) === null,
      "nonmember cannot read private identity",
    );
    const socials = await database
      .insert(schema.talentSocials)
      .values(
        [aTalent, bTalent].map((talent) => ({
          talentId: talent.id,
          platform: "yt",
          handle: talent.slug,
          followersDisplay: "-",
          hexColor: "#123456",
        })),
      )
      .returning();
    for (const social of socials) {
      await database.insert(schema.talentChannelSnapshots).values({
        talentId: social.talentId,
        socialId: social.id,
        platform: "youtube",
        snapshotDate: "2026-09-06",
        followers: 123,
        dataSource: "synthetic_qa",
      });
      await database.insert(schema.talentContentPerformance).values({
        talentId: social.talentId,
        socialId: social.id,
        platform: "youtube",
        externalContentId: social.handle,
        title: social.handle,
        contentUrl: "https://example.invalid/fixture",
        publishedAt: now,
        viewCount: 12,
      });
    }
    const dashboardA = await a.dashboard();
    const dashboardB = await b.dashboard();
    check(
      dashboardA.snapshots.length === 1 &&
        dashboardB.snapshots.length === 1 &&
        dashboardA.snapshots[0]?.socialId !== dashboardB.snapshots[0]?.socialId,
      "metrics scoped to connected talent",
    );
    check(
      dashboardA.content[0]?.title === aTalent.slug &&
        dashboardB.content[0]?.title === bTalent.slug,
      "published content scoped",
    );
    check(
      !("amountBrand" in dashboardA) &&
        !("createdBy" in (dashboardA.content[0] ?? {})),
      "dashboard projection excludes commercial and author fields",
    );
    const input = StudioProjectInput.parse({
      title: "Fixture educativa",
      brief: "Un consejo de prueba, sin datos reales.",
      script: "Hook\n\nEjemplo\n\nCierre",
      template: "educational",
      platform: "tiktok",
      cta: "Guardar",
    });
    const pa = await a.save(input);
    const pb = await b.save(input);
    assert.ok(pa && pb);
    check((await outsider.save(input)) === null, "nonmember cannot create");
    check(
      (await a.projects()).length === 1 && (await b.projects()).length === 1,
      "lists scoped",
    );
    check(
      (await a.project(pb.id)) === null && (await b.project(pa.id)) === null,
      "cross read rejected",
    );
    check(
      (await b.save(input, { id: pa.id, revision: 0 })) === null,
      "cross update rejected",
    );
    check((await b.submit(pa.id, 0)) === null, "cross submit rejected");
    check(
      (await b.versions(pa.id)).length === 0 &&
        (await b.reviews(pa.id)).length === 0,
      "history and reviews scoped",
    );
    check(Boolean(await a.submit(pa.id, 0)), "owner submits");
    check(
      await reviewStudioProject(
        database,
        {
          id: pa.id,
          revision: 0,
          decision: "approved",
          comment: "Guion revisado.",
        },
        "studio-test-agency",
      ),
      "agency approves exact version",
    );
    check(
      !(await reviewStudioProject(
        database,
        { id: pa.id, revision: 0, decision: "approved", comment: "Replay" },
        "studio-test-agency",
      )),
      "review replay rejected",
    );
    check((await a.reviews(pa.id)).length === 1, "review persisted once");
    const updated = await a.save(
      { ...input, title: "Segunda versión" },
      { id: pa.id, revision: 0 },
    );
    check(
      updated?.status === "draft" && updated.revision === 1,
      "edit invalidates approval",
    );
    check(
      (await a.save(input, { id: pa.id, revision: 0 })) === null,
      "stale edit rejected",
    );
    check(
      (await a.versions(pa.id)).length === 2,
      "immutable versions retained",
    );
    const assetInput = {
      projectId: pa.id,
      name: "fixture.png",
      storageKey: "private/studio/fixture-a.png",
      checksum: "a".repeat(64),
      contentType: "image/png",
      size: 100,
    };
    check(
      (await b.addAsset(assetInput)) === null,
      "cross project asset attachment rejected",
    );
    const asset = await a.addAsset(assetInput);
    assert.ok(asset);
    check(
      (await a.assets()).length === 1 && (await b.assets()).length === 0,
      "library scoped",
    );
    check(
      (await b.asset(asset.id)) === null,
      "cross private download rejected",
    );
    check(
      (await outsider.dashboard()).snapshots.length === 0,
      "nonmember dashboard empty",
    );
    const independentInvite = await issueStudioInvitation(
      database,
      aTalent.id,
      "c@studio.test",
      "studio-test-agency",
    );
    const [member] = await database
      .select()
      .from(schema.talentUsers)
      .where(eq(schema.talentUsers.userId, "studio-test-a"));
    assert.ok(member);
    check(await revokeStudioMember(database, member.id), "agency revokes");
    check(
      (await a.profile()) === null,
      "revoked creator loses private identity access",
    );
    const [otherInvite] = await database
      .select()
      .from(schema.studioInvitations)
      .where(
        eq(
          schema.studioInvitations.tokenHash,
          invitationHash(independentInvite),
        ),
      );
    check(
      otherInvite?.revokedAt === null,
      "revocation leaves other representative invitations intact",
    );
    check(
      (await a.membership()) === null &&
        (await a.projects()).length === 0 &&
        (await a.asset(asset.id)) === null,
      "revocation blocks existing session reads",
    );
    check(
      (await a.save(input)) === null && (await a.submit(pa.id, 1)) === null,
      "revocation blocks writes",
    );
    check((await b.projects()).length === 1, "other creator unaffected");
    await database.insert(schema.studioProjects).values(
      Array.from({ length: 99 }, (_, i) => ({
        ...input,
        title: `Quota fixture ${i}`,
        talentId: bTalent.id,
        createdBy: "studio-test-b",
      })),
    );
    check((await b.save(input)) === null, "project pilot cap enforced");
    check(
      Boolean(await b.save(input, { id: pb.id, revision: 0 })),
      "quota does not block existing project edits",
    );
    await database.insert(schema.studioAssets).values(
      Array.from({ length: 25 }, (_, i) => ({
        ...assetInput,
        projectId: pb.id,
        talentId: bTalent.id,
        rightsConfirmedBy: "studio-test-b",
        storageKey: `private/quota-${i}.png`,
        size: 20 * 1024 * 1024,
      })),
    );
    check(
      (await b.addAsset({
        ...assetInput,
        projectId: pb.id,
        storageKey: "private/exceeds-quota.png",
      })) === null,
      "storage cap enforced in transaction",
    );
    console.log(
      JSON.stringify({
        ok: true,
        checks,
        database: "PGlite in-memory PostgreSQL",
        productionTouched: false,
        historicalMigrationChainTested: false,
      }),
    );
  } finally {
    await pg.close();
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Isolated Studio test failed",
  );
  process.exitCode = 1;
});
