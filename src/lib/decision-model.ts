// Lunia Decision Model — pure unit-economics calc.
//
// Source of truth: the "Lunia Decision Model — CMS Build Spec". This module is
// framework-free and side-effect-free (no fetch, no React) so the parity test
// can run it directly. Input an object, return an object. Match the spreadsheet
// to the cent — see decision-model.test.ts for the acceptance check.

export type DecisionModelInputs = {
  // --- Actuals (from Meta + Shopify) ---
  adSpend: number;
  metaPurchases: number;
  nSub: number;
  nOneTime: number;
  nPack: number;
  nRecurring: number;       // tracked for retention; excluded from new-customer math
  pSubFirst: number;
  pSubRec: number;
  pOneTime: number;
  pPack: number;
  // --- Editable assumptions (defaults applied when omitted) ---
  varCost?: number;          // default 13.00
  varCostPack?: number;      // default varCost * 3
  subLife?: number;          // default 5.0
  oneTimeRepeatRate?: number;   // default 0.20
  oneTimeExtraOrders?: number;  // default 1.5
  packRepeatRate?: number;      // default 0.12
  packExtraOrders?: number;     // default 1.0
  cac?: number;              // default = blended (adSpend / newCustomers)
  targetLtvCac?: number;     // default 3.0
};

export type Verdict = "HEALTHY" | "THIN" | "UNDERWATER";

export type ScenarioGrid = {
  mixes: number[];
  lives: number[];
  cells: number[][];        // [rowMix][colLife] = blended LTV:CAC
  liveRowIndex: number;     // row whose mix is nearest the current subMix
};

export type DecisionModelOutputs = {
  // resolved assumptions actually used (defaults filled in)
  resolved: Required<Omit<DecisionModelInputs,
    "adSpend" | "metaPurchases" | "nSub" | "nOneTime" | "nPack" | "nRecurring" |
    "pSubFirst" | "pSubRec" | "pOneTime" | "pPack">>;

  newCustomers: number;
  subMix: number;
  blendedCac: number;
  metaCac: number;
  firstOrderRoas: number;

  subFirstGp: number;
  subLtv: number;
  subLtvCac: number;
  subPaybackMonths: number;  // Infinity when recurring GP <= 0 (never pays back)

  oneTimeFirstGp: number;
  oneTimeLifeOrders: number;
  oneTimeLtv: number;
  oneTimeLtvCac: number;

  packFirstGp: number;
  packLifeOrders: number;
  packLtv: number;
  packLtvCac: number;

  blendedFirstGp: number;
  blendedLtv: number;
  blendedLtvCac: number;
  verdict: Verdict;

  nonSubLtv: number;
  breakevenMixTarget: number;   // may exceed 1; see breakevenReachable
  breakevenMix1x: number;
  breakevenReachable: boolean;  // false when target mix > 1 (not reachable)

  scenario: ScenarioGrid;
};

const SCENARIO_MIXES = [0.20, 0.30, 0.354, 0.40, 0.50, 0.60, 0.70];
const SCENARIO_LIVES = [3, 4, 5, 6, 8, 10];

/** Safe divide — returns 0 when the denominator is 0 (UI shows N/A upstream). */
function div(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function computeDecisionModel(input: DecisionModelInputs): DecisionModelOutputs {
  const varCost = input.varCost ?? 13.0;
  const varCostPack = input.varCostPack ?? varCost * 3;
  const subLife = input.subLife ?? 5.0;
  const oneTimeRepeatRate = input.oneTimeRepeatRate ?? 0.20;
  const oneTimeExtraOrders = input.oneTimeExtraOrders ?? 1.5;
  const packRepeatRate = input.packRepeatRate ?? 0.12;
  const packExtraOrders = input.packExtraOrders ?? 1.0;
  const targetLtvCac = input.targetLtvCac ?? 3.0;

  const { adSpend, metaPurchases, nSub, nOneTime, nPack, pSubFirst, pSubRec, pOneTime, pPack } = input;

  const newCustomers = nSub + nOneTime + nPack;
  const subMix = div(nSub, newCustomers);
  const blendedCac = div(adSpend, newCustomers);
  const metaCac = div(adSpend, metaPurchases);

  // CAC defaults to blended when the caller doesn't pin one.
  const cac = input.cac ?? blendedCac;

  const firstOrderRoas = div(nSub * pSubFirst + nOneTime * pOneTime + nPack * pPack, adSpend);

  // Subscription cohort
  const subRecGp = pSubRec - varCost;
  const subFirstGp = pSubFirst - varCost;
  const subLtv = subFirstGp + (subLife - 1) * subRecGp;
  const subLtvCac = div(subLtv, cac);
  // Months to recover CAC on a monthly recurring cadence. If recurring GP is
  // non-positive the subscription never pays back → Infinity.
  const subPaybackMonths = subRecGp <= 0 ? Infinity : Math.max(0, (cac - subFirstGp) / subRecGp);

  // One-time cohort
  const oneTimeFirstGp = pOneTime - varCost;
  const oneTimeLifeOrders = 1 + oneTimeRepeatRate * oneTimeExtraOrders;
  const oneTimeLtv = oneTimeFirstGp * oneTimeLifeOrders;
  const oneTimeLtvCac = div(oneTimeLtv, cac);

  // 3-pack cohort
  const packFirstGp = pPack - varCostPack;
  const packLifeOrders = 1 + packRepeatRate * packExtraOrders;
  const packLtv = packFirstGp * packLifeOrders;
  const packLtvCac = div(packLtv, cac);

  // Blended (weighted by new-customer counts)
  const blendedFirstGp = div(nSub * subFirstGp + nOneTime * oneTimeFirstGp + nPack * packFirstGp, newCustomers);
  const blendedLtv = div(nSub * subLtv + nOneTime * oneTimeLtv + nPack * packLtv, newCustomers);
  const blendedLtvCac = div(blendedLtv, cac);
  const verdict: Verdict = blendedLtvCac >= 3 ? "HEALTHY" : blendedLtvCac >= 1 ? "THIN" : "UNDERWATER";

  // Break-even subscription mix
  const nonSubLtv = div(nOneTime * oneTimeLtv + nPack * packLtv, nOneTime + nPack);
  const subVsNon = subLtv - nonSubLtv;
  const breakevenMixTarget = div(targetLtvCac * cac - nonSubLtv, subVsNon);
  const breakevenMix1x = div(1 * cac - nonSubLtv, subVsNon);
  const breakevenReachable = subVsNon !== 0 && breakevenMixTarget <= 1;

  // Scenario grid
  const cells = SCENARIO_MIXES.map((mix) =>
    SCENARIO_LIVES.map((life) => {
      const subLtvAtLife = (pSubFirst - varCost) + (life - 1) * subRecGp;
      const blendedAtMix = mix * subLtvAtLife + (1 - mix) * nonSubLtv;
      return div(blendedAtMix, cac);
    }),
  );
  let liveRowIndex = 0;
  let nearest = Infinity;
  SCENARIO_MIXES.forEach((mix, i) => {
    const d = Math.abs(mix - subMix);
    if (d < nearest) { nearest = d; liveRowIndex = i; }
  });

  return {
    resolved: { varCost, varCostPack, subLife, oneTimeRepeatRate, oneTimeExtraOrders, packRepeatRate, packExtraOrders, cac, targetLtvCac },
    newCustomers, subMix, blendedCac, metaCac, firstOrderRoas,
    subFirstGp, subLtv, subLtvCac, subPaybackMonths,
    oneTimeFirstGp, oneTimeLifeOrders, oneTimeLtv, oneTimeLtvCac,
    packFirstGp, packLifeOrders, packLtv, packLtvCac,
    blendedFirstGp, blendedLtv, blendedLtvCac, verdict,
    nonSubLtv, breakevenMixTarget, breakevenMix1x, breakevenReachable,
    scenario: { mixes: SCENARIO_MIXES, lives: SCENARIO_LIVES, cells, liveRowIndex },
  };
}
