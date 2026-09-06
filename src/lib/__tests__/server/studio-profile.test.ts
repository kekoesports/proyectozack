import { StudioProfileDocument } from "@/lib/schemas/studio-profile";
import { parseStudioRange, studioRangeStream } from "@/lib/studio/byte-range";
import { nuevaClave } from "@/lib/storage/keys";

export const TEST_PROFILE = {
  version: 1,
  displayName: "Fixture",
  role: "Creator",
  bio: "Synthetic identity",
  pronunciation: "Use original audio",
  voiceStatus: "reference_only",
  usageScope: "Private fixture only",
  portraitAssetId: null,
  voiceAssetId: null,
  approvedVideoAssetId: null,
  logoAssetId: null,
  guidelines: ["Review face"],
  team: [],
  currentCreators: [],
  collaborators: [],
  cases: [],
  sources: [{ label: "Fixture", kind: "owner", date: "2026-09-06" }],
  publicationNotes: "",
};

describe("Studio profile boundaries", () => {
  it("accepts bounded reference data, strips unknown provider secrets", () => {
    const result = StudioProfileDocument.safeParse({
      ...TEST_PROFILE,
      apiKey: "do-not-forward",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("apiKey");
  });
  it("rejects unsafe source protocols and malformed asset IDs", () => {
    expect(
      StudioProfileDocument.safeParse({
        ...TEST_PROFILE,
        portraitAssetId: "../other",
      }).success,
    ).toBe(false);
    expect(
      StudioProfileDocument.safeParse({
        ...TEST_PROFILE,
        sources: [
          {
            label: "Unsafe",
            date: "2026-09-06",
            kind: "owner",
            url: "javascript:alert(1)",
          },
        ],
      }).success,
    ).toBe(false);
  });
  it.each([
    ["mp4", "video/mp4"],
    ["wav", "audio/wav"],
    ["ogg", "audio/ogg"],
  ])("storage accepts validated %s media", (extension, mime) => {
    expect(
      nuevaClave({
        filename: `clip.${extension}`,
        contentType: mime,
        prefix: "studio",
      }),
    ).toMatch(new RegExp(`^studio/.+\\.${extension}$`));
    expect(() =>
      nuevaClave({ filename: `clip.${extension}`, contentType: "text/html" }),
    ).toThrow();
  });
});

describe("Studio private playback ranges", () => {
  it.each([
    ["bytes=0-3", { start: 0, end: 3 }],
    ["bytes=7-", { start: 7, end: 9 }],
    ["bytes=-3", { start: 7, end: 9 }],
    ["bytes=0-99", { start: 0, end: 9 }],
    ["bytes=-100", { start: 0, end: 9 }],
    ["bytes=10-", null],
    ["bytes=-0", null],
    ["bytes=5-4", null],
    ["bytes=0-1,3-4", null],
    ["bytes=-", null],
    ["bytes=999999999999999999999-", null],
  ])("parses %s", (header, expected) =>
    expect(parseStudioRange(header, 10)).toEqual(expected),
  );
  it("slices across chunks and cancels the source after the range", async () => {
    const cancel = jest.fn();
    const chunks = [
      new Uint8Array([0, 1, 2]),
      new Uint8Array([3, 4, 5]),
      new Uint8Array([6, 7, 8]),
    ];
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
      },
      cancel,
    });
    const response = new Response(
      studioRangeStream(source, { start: 2, end: 4 }),
    );
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
      2, 3, 4,
    ]);
    expect(cancel).toHaveBeenCalled();
  });
});
