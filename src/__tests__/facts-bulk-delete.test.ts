import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Fact } from "@/lib/types";

const store: { facts: Fact[] } = { facts: [] };
const saveFacts = vi.fn(async (next: Fact[]) => { store.facts = next; });

vi.mock("@/lib/kv", () => ({
  getFacts: async () => store.facts,
  saveFacts: (next: Fact[]) => saveFacts(next),
  deleteFact: vi.fn(),
}));

const { DELETE } = await import("@/app/api/facts/route");

const fact = (id: string) => ({ id, statement: `s-${id}`, subjectText: "Melatonin and age", status: "pending", source: {} }) as Fact;
const req = (body: unknown) => new Request("http://x/api/facts", { method: "DELETE", body: JSON.stringify(body) });

describe("bulk delete", () => {
  beforeEach(() => {
    saveFacts.mockClear();
    store.facts = ["a", "b", "c", "d"].map(fact);
  });

  it("removes exactly the facts asked for, in one write", async () => {
    const res = await DELETE(req({ ids: ["a", "c"] }));
    await expect(res.json()).resolves.toMatchObject({ ok: true, deleted: 2, remaining: 2 });
    expect(store.facts.map((f) => f.id)).toEqual(["b", "d"]);
    // One save for the whole set, not one per fact: deleting through the
    // per-id route rewrote the entire ledger once per fact.
    expect(saveFacts).toHaveBeenCalledTimes(1);
  });

  it("ignores an id that is not in the ledger", async () => {
    const res = await DELETE(req({ ids: ["a", "not-here"] }));
    await expect(res.json()).resolves.toMatchObject({ deleted: 1, remaining: 3 });
  });

  it("refuses an empty or malformed request rather than touching the ledger", async () => {
    for (const body of [{}, { ids: [] }, { ids: "a" }, { ids: [1, 2] }]) {
      const res = await DELETE(req(body));
      expect(res.status).toBe(400);
    }
    expect(saveFacts).not.toHaveBeenCalled();
    expect(store.facts).toHaveLength(4);
  });

  it("writes nothing when none of the ids match", async () => {
    const res = await DELETE(req({ ids: ["nope"] }));
    await expect(res.json()).resolves.toMatchObject({ deleted: 0 });
    expect(saveFacts).not.toHaveBeenCalled();
  });

  it("caps one request so a runaway client cannot clear the ledger", async () => {
    store.facts = Array.from({ length: 600 }, (_, i) => fact(`f${i}`));
    const res = await DELETE(req({ ids: store.facts.map((f) => f.id) }));
    await expect(res.json()).resolves.toMatchObject({ deleted: 500, remaining: 100 });
  });
});
