import { expect, it } from "vitest";
import { legacyBlockLines } from "./legacy-email-block";
it("preserves saved comparison, badge and product copy for display", () => {
  const block = { kind: "beforeafter", beforeLabel: "Before", beforeItems: ["One"], afterLabel: "After", afterItems: ["Two"] };
  expect(legacyBlockLines(block)).toEqual(["Before", "One", "After", "Two"]);
  expect(block.kind).toBe("beforeafter");
  expect(legacyBlockLines({ kind: "badges", badges: ["Melatonin-free"] })).toEqual(["Melatonin-free"]);
  expect(legacyBlockLines({ kind: "product", productName: "Restore", productPrice: "$29", productNote: "60 capsules" })).toEqual(["Restore", "$29", "60 capsules"]);
});
