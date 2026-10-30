// Media → Twenty attachment tests. No network, no disk: the in-memory MOCK
// TwentyClient stands in for both deployments and the MediaReader seam stands
// in for the filesystem, so kind policy, targeting and failure isolation are
// exercised exactly as in production.
import { describe, expect, it } from "vitest";
import { createTwentyClient, type TwentyClient } from "./client";
import {
  attachWaMediaToTwenty,
  classifyWaMedia,
  mediaFileName,
} from "./media-attachment";

const BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // "%PNG" magic, content irrelevant

async function allRows(client: TwentyClient, objectPath: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const row of client.listAll<Record<string, unknown>>(objectPath)) out.push(row);
  return out;
}

describe("classifyWaMedia", () => {
  it("uploads images and documents", () => {
    expect(classifyWaMedia("wa/babek/eid-front.jpg")).toBe("upload");
    expect(classifyWaMedia("wa/cardiwan/licence.PNG")).toBe("upload"); // case-insensitive
    expect(classifyWaMedia("wa/babek/receipt.pdf")).toBe("upload");
    expect(classifyWaMedia("wa/babek/scan.webp")).toBe("upload");
  });

  it("uploads voice notes and other audio (owner: voice matters)", () => {
    expect(classifyWaMedia("wa/babek/2A00F7.ogg")).toBe("upload");
    expect(classifyWaMedia("wa/babek/note.m4a")).toBe("upload");
    expect(classifyWaMedia("wa/babek/recording.mp3")).toBe("upload");
  });

  it("skips video (too large for the CRM, for now)", () => {
    expect(classifyWaMedia("wa/babek/clip.mp4")).toBe("video");
  });

  it("skips anything it cannot vouch for", () => {
    expect(classifyWaMedia("wa/babek/payload.exe")).toBe("unknown");
    expect(classifyWaMedia("wa/babek/noextension")).toBe("unknown");
  });
});

describe("mediaFileName", () => {
  it("files the attachment under the original basename", () => {
    expect(mediaFileName("wa/babek-rent/2A00F7A1.jpg")).toBe("2A00F7A1.jpg");
  });
});

describe("attachWaMediaToTwenty", () => {
  it("uploads the file and attaches it to the person AND the deal", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const result = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid-front.jpg",
      personId: "person-1",
      opportunityId: "opp-9",
      readMedia: async () => BYTES,
    });

    expect(result).toEqual({ attached: true });
    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({
      name: "eid-front.jpg",
      targetPersonId: "person-1",
      targetOpportunityId: "opp-9",
    });
    // The FILES field references the uploaded file by fileId, labeled with
    // the original name — the shape the live workspace validated 2026-08-21.
    expect(att.file).toEqual([
      { fileId: expect.stringMatching(/^mock-file-/), label: "eid-front.jpg" },
    ]);
  });

  it("also targets the day's aggregated note when one is known", async () => {
    const client = createTwentyClient({ mode: "mock" });
    await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid.jpg",
      personId: "person-1",
      opportunityId: "opp-9",
      noteId: "note-7",
      readMedia: async () => BYTES,
    });

    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({
      targetPersonId: "person-1",
      targetOpportunityId: "opp-9",
      targetNoteId: "note-7",
    });
  });

  it("targets only the person when no deal matched (mirrors noteTargets)", async () => {
    const client = createTwentyClient({ mode: "mock" });
    await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/receipt.pdf",
      personId: "person-1",
      opportunityId: null,
      readMedia: async () => BYTES,
    });

    const [att] = await allRows(client, "attachments");
    expect(att.targetPersonId).toBe("person-1");
    expect(att).not.toHaveProperty("targetOpportunityId");
    expect(att).not.toHaveProperty("targetNoteId");
  });

  it("uploads a voice note (its transcript is ALSO the note line)", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const result = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/voice.ogg",
      personId: "person-1",
      readMedia: async () => BYTES,
    });

    expect(result).toEqual({ attached: true });
    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({ name: "voice.ogg", targetPersonId: "person-1" });
  });

  it("skips a video without any Twenty write", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const result = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/clip.mp4",
      personId: "person-1",
      readMedia: async () => BYTES,
    });

    expect(result).toEqual({ attached: false, reason: "video" });
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a missing file on disk is a result, not an exception — and no write", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const result = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/gone.jpg",
      personId: "person-1",
      readMedia: async () => null,
    });

    expect(result).toEqual({ attached: false, reason: "unreadable" });
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("re-walks do not duplicate: same file + person attaches only once", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const first = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid-front.jpg",
      personId: "person-1",
      readMedia: async () => BYTES,
    });
    const second = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid-front.jpg",
      personId: "person-1",
      readMedia: async () => BYTES,
    });

    expect(first).toEqual({ attached: true });
    expect(second).toEqual({ attached: false, reason: "duplicate" });
    expect(await allRows(client, "attachments")).toHaveLength(1);
  });

  it("the dedupe key includes the person: same file, different customer attaches", async () => {
    const client = createTwentyClient({ mode: "mock" });
    await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid-front.jpg",
      personId: "person-1",
      readMedia: async () => BYTES,
    });
    const other = await attachWaMediaToTwenty(client, {
      mediaPath: "wa/babek/eid-front.jpg",
      personId: "person-2",
      readMedia: async () => BYTES,
    });

    expect(other).toEqual({ attached: true });
    expect(await allRows(client, "attachments")).toHaveLength(2);
  });

  it("propagates a Twenty-side upload failure (the caller counts mediaFailed)", async () => {
    const base = createTwentyClient({ mode: "mock" });
    const client: TwentyClient = {
      ...base,
      uploadFile: () => Promise.reject(new Error("Twenty POST /metadata HTTP 500: boom")),
    };
    await expect(
      attachWaMediaToTwenty(client, {
        mediaPath: "wa/babek/eid.jpg",
        personId: "person-1",
        readMedia: async () => BYTES,
      })
    ).rejects.toThrow("HTTP 500");
  });
});
