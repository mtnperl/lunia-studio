import { describe, it, expect } from "vitest";
import { computeDecisionModel, type DecisionModelInputs } from "./decision-model";

// Parity test (acceptance check) — May→Jun 2026 numbers from the spec.
// If these match, the port is faithful to the spreadsheet. If not, the
// formulas are wrong; fix them before shipping UI.
const MAY_JUN_2026: DecisionModelInputs = {
  adSpend: 3818, metaPurchases: 32, nSub: 17, nOneTime: 24, nPack: 3, nRecurring: 10,
  pSubFirst: 29.21, pSubRec: 28.95, pOneTime: 38.34, pPack: 99.0,
  varCost: 13, varCostPack: 29, subLife: 5,
  oneTimeRepeatRate: 0.2, oneTimeExtraOrders: 1.5,
  packRepeatRate: 0.12, packExtraOrders: 1.0,
  cac: 80, targetLtvCac: 3.0,
};

describe("computeDecisionModel — spreadsheet parity (May→Jun 2026)", () => {
  const out = computeDecisionModel(MAY_JUN_2026);

  it("new customers = 44", () => expect(out.newCustomers).toBe(44));
  it("sub mix = 0.386", () => expect(out.subMix).toBeCloseTo(0.386, 3));
  it("blended CAC = 86.77", () => expect(out.blendedCac).toBeCloseTo(86.77, 2));
  it("meta CAC = 119.31", () => expect(out.metaCac).toBeCloseTo(119.31, 2));
  it("first-order ROAS = 0.449", () => expect(out.firstOrderRoas).toBeCloseTo(0.449, 3));
  it("sub LTV:CAC = 1.00", () => expect(out.subLtvCac).toBeCloseTo(1.0, 2));
  it("one-time LTV:CAC = 0.41", () => expect(out.oneTimeLtvCac).toBeCloseTo(0.41, 2));
  it("3-pack LTV:CAC = 0.98", () => expect(out.packLtvCac).toBeCloseTo(0.98, 2));
  it("blended LTV:CAC = 0.68", () => expect(out.blendedLtvCac).toBeCloseTo(0.68, 2));
  it("verdict = UNDERWATER", () => expect(out.verdict).toBe("UNDERWATER"));
  it("sub payback months = 4.0", () => expect(out.subPaybackMonths).toBeCloseTo(4.0, 1));
});

describe("computeDecisionModel — guardrails", () => {
  it("cac defaults to blended when omitted", () => {
    const { cac } = MAY_JUN_2026;
    void cac;
    const noCac = computeDecisionModel({ ...MAY_JUN_2026, cac: undefined });
    expect(noCac.resolved.cac).toBeCloseTo(86.77, 2); // = blended
  });

  it("varCostPack defaults to varCost * 3", () => {
    const d = computeDecisionModel({ ...MAY_JUN_2026, varCostPack: undefined });
    expect(d.resolved.varCostPack).toBe(39);
  });

  it("no divide-by-zero with empty actuals", () => {
    const d = computeDecisionModel({
      adSpend: 0, metaPurchases: 0, nSub: 0, nOneTime: 0, nPack: 0, nRecurring: 0,
      pSubFirst: 0, pSubRec: 0, pOneTime: 0, pPack: 0,
    });
    expect(d.newCustomers).toBe(0);
    expect(Number.isFinite(d.blendedCac)).toBe(true);
    expect(Number.isFinite(d.metaCac)).toBe(true);
  });

  it("payback is Infinity when recurring GP <= 0", () => {
    const d = computeDecisionModel({ ...MAY_JUN_2026, pSubRec: 10, varCost: 13 });
    expect(d.subPaybackMonths).toBe(Infinity);
  });
});
