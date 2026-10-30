// Tests for the WhatsApp-conversation → DEAL link (Babek, 2026-08-07:
// «Открываю сделку — истории нет»), and for the per-instance stage vocabulary
// that the rental board and the Bitrix mirror have to agree on.
import { describe, expect, it } from "vitest";
import { buildOpportunityPhoneIndex, bodyWithWaLink, fetchOpportunitiesForTails, phoneFromDealTitle, waLinksField, waMeLink } from "./deal-link";
import { planMirrorRecord, type MirrorSourceRow } from "./mirror";
import { CLOSED_STAGES, isManualStage, RENTAL_STAGES, toInstanceStage } from "./stages";

const SINCE = new Date("2024-01-01T00:00:00Z");

function dealRow(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `BX-${id} rental`,
    status: "open",
    stage: "quote",
    stageDetail: "КП отправлено",
    value: 50000,
    modifiedAt: new Date("2026-08-01T00:00:00Z"),
    ...over,
  };
}

function opp(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "opp-1",
    name: "BX-1 rental",
    stage: "NEW_REQUEST",
    updatedAt: "2026-08-01T00:00:00.000Z",
    phoneTail9: null,
    deletedAt: null,
    ...over,
  };
}

// ─── The phone hiding in a Bitrix deal title ────────────────────────────────

describe("phoneFromDealTitle", () => {
  it("reads the customer number out of the live title shapes", () => {
    // Verbatim from workspace_7tkxm1eeqb4iopvi5ica5vos4.opportunity, 2026-08-07.
    expect(phoneFromDealTitle("Новый лид по звонку с 971502222073 из Callgear")).toBe("971502222073");
    expect(phoneFromDealTitle("Пропущенный лид по звонку с 97455819604 из Callgear")).toBe("97455819604");
    expect(phoneFromDealTitle("Гость - 971566997218 Insta Easy Rent")).toBe("971566997218");
  });

  it("refuses the queue/widget numbers that also live in titles", () => {
    // "Открытая линия 8816" is a Bitrix channel id, not a person. Mistaking it
    // for a phone would file every widget lead onto one deal.
    expect(phoneFromDealTitle("Xime Martinez - Открытая линия 8816 (Виджет на сайте)")).toBeNull();
    expect(phoneFromDealTitle("BX-4021 rental")).toBeNull();
    expect(phoneFromDealTitle(null)).toBeNull();
  });
});

// ─── Which deal a conversation is filed under ───────────────────────────────

describe("buildOpportunityPhoneIndex", () => {
  it("keys deals by the stored phoneTail9", () => {
    const idx = buildOpportunityPhoneIndex([opp({ id: "a", phoneTail9: "502222073" })]);
    expect(idx.get("502222073")?.id).toBe("a");
  });

  it("falls back to the title for deals the mirror has not re-touched", () => {
    // All 1,099 rental deals had an EMPTY phoneTail9 on 2026-08-07 — without
    // this fallback the link would only work for deals synced after deploy.
    const idx = buildOpportunityPhoneIndex([
      opp({ id: "a", name: "Новый лид по звонку с 971502222073 из Callgear" }),
    ]);
    expect(idx.get("502222073")?.id).toBe("a");
  });

  it("prefers an OPEN deal over a closed one, whatever the dates say", () => {
    const idx = buildOpportunityPhoneIndex([
      opp({
        id: "closed",
        phoneTail9: "502222073",
        stage: "COMPLETED",
        updatedAt: "2026-08-06T00:00:00.000Z",
      }),
      opp({
        id: "open",
        phoneTail9: "502222073",
        stage: "IN_PROGRESS",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ]);
    expect(idx.get("502222073")?.id).toBe("open");
  });

  it("takes the most recently updated when both are open", () => {
    const idx = buildOpportunityPhoneIndex([
      opp({ id: "old", phoneTail9: "502222073", updatedAt: "2026-01-01T00:00:00.000Z" }),
      opp({ id: "new", phoneTail9: "502222073", updatedAt: "2026-08-06T00:00:00.000Z" }),
    ]);
    expect(idx.get("502222073")?.id).toBe("new");
  });

  it("still files under a closed deal when that is all the customer has", () => {
    const idx = buildOpportunityPhoneIndex([
      opp({ id: "done", phoneTail9: "502222073", stage: "CANCELLED" }),
    ]);
    expect(idx.get("502222073")?.id).toBe("done");
    expect(idx.get("502222073")?.open).toBe(false);
  });

  it("never files a live conversation into the trash", () => {
    const idx = buildOpportunityPhoneIndex([
      opp({ id: "gone", phoneTail9: "502222073", deletedAt: "2026-08-01T00:00:00.000Z" }),
    ]);
    expect(idx.size).toBe(0);
  });

  it("never files one brand's chat onto the other brand's deal", () => {
    // Cardiwan and EasyRent share ONE workspace and 1,346 phone numbers. The
    // same human being a client of both is two deals, and an unscoped index
    // hands EasyRent's conversation to whichever was indexed first.
    const records = [
      opp({ id: "cw", phoneTail9: "502222073", brandLine: "cardiwan" }),
      opp({ id: "er", phoneTail9: "502222073", brandLine: "easyrent" }),
    ];
    expect(buildOpportunityPhoneIndex(records, "easyrent").get("502222073")?.id).toBe("er");
    expect(buildOpportunityPhoneIndex(records, "cardiwan").get("502222073")?.id).toBe("cw");
  });

  it("ignores numbers too short to identify anyone", () => {
    const idx = buildOpportunityPhoneIndex([opp({ id: "a", phoneTail9: "8816" })]);
    expect(idx.size).toBe(0);
  });

  it("treats BOTH vocabularies' terminal stages as closed", () => {
    // The projector runs against sales and rental with the same code and is
    // never told which board it is looking at. UNSUCCESSFUL_DEAL / NOT_A_LEAD
    // are the rental board's terminal columns since the 2026-08-28 rebuild;
    // CANCELLED is the pre-rebuild lost value kept closed for old rows.
    for (const stage of ["CUSTOMER", "LOST", "COMPLETED", "UNSUCCESSFUL_DEAL", "NOT_A_LEAD", "CANCELLED"]) {
      expect(CLOSED_STAGES.has(stage)).toBe(true);
    }
    expect(CLOSED_STAGES.has("EXISTING_CLIENT")).toBe(false);
  });
});

describe("fetchOpportunitiesForTails", () => {
  /** Minimal TwentyClient stand-in that records the filters it was asked for. */
  function fakeClient(byTail: Record<string, Record<string, unknown>[]>) {
    const filters: string[] = [];
    return {
      filters,
      client: {
        async *listAll(_path: string, params?: Record<string, unknown>) {
          const filter = String(params?.filter ?? "");
          filters.push(filter);
          const wanted = filter.match(/\[in\]:\[([^\]]*)\]/)?.[1]?.split(",") ?? [];
          for (const tail of wanted) for (const rec of byTail[tail] ?? []) yield rec;
        },
      } as unknown as Parameters<typeof fetchOpportunitiesForTails>[0],
    };
  }

  it("asks only for the numbers in this batch", async () => {
    // The whole point: a full crawl of the sales book is ~1,315 requests on a
    // job that runs every minute.
    const { client, filters } = fakeClient({
      "502222073": [opp({ id: "a", phoneTail9: "502222073" })],
    });
    const idx = await fetchOpportunitiesForTails(client, ["502222073", "502222073"]);
    expect(idx.get("502222073")?.id).toBe("a");
    expect(filters).toHaveLength(1);
    expect(filters[0]).toBe("phoneTail9[in]:[502222073]");
  });

  it("drops numbers too short to be a match key before asking", async () => {
    const { client, filters } = fakeClient({});
    await fetchOpportunitiesForTails(client, ["8816", ""]);
    expect(filters).toHaveLength(0);
  });

  it("chunks a large batch instead of building one giant filter", async () => {
    const tails = Array.from({ length: 120 }, (_, i) => String(500000000 + i));
    const { client, filters } = fakeClient({});
    await fetchOpportunitiesForTails(client, tails);
    expect(filters).toHaveLength(3);
    expect(filters.every((f) => f.split(",").length <= 50)).toBe(true);
  });

  it("still applies the brand scope to what comes back", async () => {
    const { client } = fakeClient({
      "502222073": [
        opp({ id: "cw", phoneTail9: "502222073", brandLine: "cardiwan" }),
        opp({ id: "er", phoneTail9: "502222073", brandLine: "easyrent" }),
      ],
    });
    const idx = await fetchOpportunitiesForTails(client, ["502222073"], "easyrent");
    expect(idx.get("502222073")?.id).toBe("er");
  });
});

// ─── The WhatsApp deep link (web.whatsapp.com direct, owner 2026-08-13) ─────

describe("waMeLink", () => {
  it("builds a dialable link from a JID-shaped number", () => {
    expect(waMeLink("971502222073@s.whatsapp.net")).toBe("https://web.whatsapp.com/send?phone=971502222073");
  });

  it("returns null rather than a broken link", () => {
    expect(waMeLink("8816")).toBeNull();
    expect(waMeLink(null)).toBeNull();
  });

  it("puts the link above the message and leaves the text alone", () => {
    const body = bodyWithWaLink("Salam, is the G63 available?", "971502222073");
    expect(body).toContain("https://web.whatsapp.com/send?phone=971502222073");
    expect(body.endsWith("Salam, is the G63 available?")).toBe(true);
  });

  it("leaves the body untouched when there is no dialable number", () => {
    expect(bodyWithWaLink("hi", "8816")).toBe("hi");
  });

  it("builds Twenty's LINKS composite for the deal card itself", () => {
    // Backfilled notes predate the link, so the note body alone would leave
    // every existing conversation without one. The field covers those.
    expect(waLinksField("971502222073")).toEqual({
      whatsapp: {
        primaryLinkUrl: "https://web.whatsapp.com/send?phone=971502222073",
        primaryLinkLabel: "+971502222073",
        secondaryLinks: [],
      },
    });
  });

  it("returns an EMPTY object, not nulls, when there is no number", () => {
    // Spread into a patch payload, a null would CLEAR a link somebody set by
    // hand; an empty object leaves the field alone.
    expect(waLinksField(null)).toEqual({});
    expect(waLinksField("8816")).toEqual({});
  });
});

// ─── Per-instance stage vocabulary ──────────────────────────────────────────

describe("stage vocabulary", () => {
  it("keeps the sales instance on Twenty's stock funnel", () => {
    // Sending the rent desk's columns to Azat's board is the mistake that got
    // our messages filed as spam.
    expect(toInstanceStage("default", "NEW")).toBe("NEW");
    expect(toInstanceStage("default", "CUSTOMER")).toBe("CUSTOMER");
  });

  it("translates the same decision tree onto the rental funnel", () => {
    expect(toInstanceStage("rental", "NEW")).toBe("NEW_REQUEST");
    expect(toInstanceStage("rental", "SCREENING")).toBe("IN_PROGRESS");
    expect(toInstanceStage("rental", "MEETING")).toBe("WE_SHOULD_REACH_OUT_AGAIN");
    expect(toInstanceStage("rental", "CUSTOMER")).toBe("COMPLETED");
    expect(toInstanceStage("rental", "LOST")).toBe("UNSUCCESSFUL_DEAL");
  });

  it("omits rather than guesses when a stage has no equivalent", () => {
    expect(toInstanceStage("rental", null)).toBeNull();
    expect(toInstanceStage("rental", "SOMETHING_ELSE")).toBeNull();
    // PROPOSAL's old target died in the 2026-08-28 rebuild and the repurposed
    // CAR_WITH_CUSTOMER column means something else now — omit, never guess.
    expect(toInstanceStage("rental", "PROPOSAL")).toBeNull();
  });

  it("treats the stages the mirror cannot know about as human-owned", () => {
    // Without this the minute-beat mirror drags an agent's card back to "new
    // lead" and the board looks like it forgets every drag.
    expect(isManualStage("rental", "CAR_WITH_CUSTOMER")).toBe(true);
    expect(isManualStage("rental", "EXISTING_CLIENT")).toBe(true);
    expect(isManualStage("rental", "RETURNING_LEAD")).toBe(true);
    expect(isManualStage("rental", "NOT_A_LEAD")).toBe(true);
    expect(isManualStage("rental", "YANGOO_DUBIZZLE")).toBe(true);
    expect(isManualStage("rental", "NEW_REQUEST")).toBe(false);
    expect(isManualStage("rental", "COMPLETED")).toBe(false);
    expect(isManualStage("rental", null)).toBe(false);
  });

  it("every rental stage is either mirror-reachable or manual, never neither", () => {
    for (const s of RENTAL_STAGES) {
      expect(typeof isManualStage("rental", s.value)).toBe("boolean");
    }
  });
});

// ─── The mirror's deal payload ──────────────────────────────────────────────

describe("planMirrorRecord — deals", () => {
  it("writes the rental funnel's values for the rental instance", () => {
    expect(planMirrorRecord("deals", dealRow("1", { status: "won" }), SINCE, "rental").payload.stage).toBe("COMPLETED");
    expect(planMirrorRecord("deals", dealRow("1", { status: "lost" }), SINCE, "rental").payload.stage).toBe("UNSUCCESSFUL_DEAL");
    expect(
      planMirrorRecord("deals", dealRow("1", { status: "open", stage: "inquiry", stageDetail: null }), SINCE, "rental")
        .payload.stage
    ).toBe("NEW_REQUEST");
  });

  it("leaves the sales instance exactly as it was", () => {
    expect(planMirrorRecord("deals", dealRow("1", { status: "won" }), SINCE).payload.stage).toBe("CUSTOMER");
    expect(planMirrorRecord("deals", dealRow("1", { status: "lost" }), SINCE).payload.stage).toBe("LOST");
  });

  it("fills phoneTail9 from the title so the deal is findable by phone", () => {
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { name: "Новый лид по звонку с 971502222073 из Callgear" }),
      SINCE,
      "rental"
    );
    expect(planned.payload.phoneTail9).toBe("502222073");
  });

  it("prefers the linked lead's phone over the title when one exists", () => {
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { name: "Новый лид по звонку с 971502222073 из Callgear", phone: "+971558431276" }),
      SINCE,
      "rental"
    );
    expect(planned.payload.phoneTail9).toBe("558431276");
  });

  it("does not take a repeated-digit placeholder over a real title number", () => {
    // normalizePhone refuses "+971559999999" as a placeholder; the fallback
    // must then still find the honest number in the title rather than give up.
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { name: "Новый лид по звонку с 971502222073 из Callgear", phone: "+971559999999" }),
      SINCE,
      "rental"
    );
    expect(planned.payload.phoneTail9).toBe("502222073");
  });

  it("omits phoneTail9 rather than writing an empty one", () => {
    const planned = planMirrorRecord("deals", dealRow("1", { name: "BX-1 rental" }), SINCE, "rental");
    expect(planned.payload.phoneTail9).toBeUndefined();
  });

  it("does NOT let a deal be phone-matched during upsert", () => {
    // The upsert index keys on PlannedRecord.phoneTail9; if a deal carried one
    // there, every deal a repeat customer ever had would collapse into one.
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { name: "Новый лид по звонку с 971502222073 из Callgear" }),
      SINCE,
      "rental"
    );
    expect(planned.phoneTail9).toBeNull();
  });
});
