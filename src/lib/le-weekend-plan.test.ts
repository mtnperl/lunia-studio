import { describe, expect, it } from "vitest";
import { settlePlan } from "./le-weekend-generate";

describe("settlePlan", () => {
  it("keeps the model's pick when it is consistent", () => {
    expect(settlePlan({}, { cover: "ivory", column: "lexique", slideCount: 1 })).toEqual({ cover: "ivory", column: "lexique", slideCount: 1 });
  });
  it("makes a navy cover courrier, and a courrier pick off a light cover a chronique", () => {
    expect(settlePlan({}, { cover: "navy", column: "regles" }).column).toBe("courrier");
    expect(settlePlan({}, { cover: "ivory", column: "courrier" }).column).toBe("chronique");
  });
  it("keeps what the editor set and gives a photo cover a second page", () => {
    expect(settlePlan({ column: "courrier" }, { cover: "photo" }).cover).toBe("navy");
    expect(settlePlan({ cover: "photo" }, { cover: "ivory", slideCount: 1 })).toMatchObject({ cover: "photo", slideCount: 2 });
    expect(settlePlan({}, { cover: "bogus", column: "bogus", slideCount: 9 }, "ivory")).toEqual({ cover: "ivory", column: "chronique", slideCount: 4 });
  });
});
