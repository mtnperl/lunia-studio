import { expect, it } from "vitest";
import { legacyBlockLines } from "./legacy-email-block";
it("preserves saved comparison, badge and product copy for display", () => {
  const block = { kind: "beforeafter", beforeLabel: "Before", beforeItems: ["One"], afterLabel: "After", afterItems: ["Two"] };
  expect(legacyBlockLines(block)).toEqual(["Before", "One", "After", "Two"]);
  expect(block.kind).toBe("beforeafter");
  expect(legacyBlockLines({ kind: "badges", badges: ["Melatonin-free"] })).toEqual(["Melatonin-free"]);
  expect(legacyBlockLines({ kind: "product", productName: "Restore", productPrice: "$29", productNote: "60 capsules" })).toEqual(["Restore", "$29", "60 capsules"]);
});

import { legacyBlockFields } from "./legacy-email-block";
import { renderCampaignEmail } from "./campaign-email-html";
import { resolveTheme } from "./campaign-theme";
import { EMAIL_FIXTURES } from "../../tests/visual/fixtures/campaign-emails";
import type { CampaignBlock } from "./types";

it("exposes editable fields without flattening saved structured blocks", () => {
  const block: Record<string, unknown> = { id: "saved", kind: "beforeafter", beforeLabel: "Before", beforeItems: ["One"], afterLabel: "After", afterItems: ["Two"] };
  const fields = legacyBlockFields("beforeafter");
  expect(fields.map((field) => field.key)).toEqual(["beforeLabel", "beforeItems", "afterLabel", "afterItems"]);
  const edited = { ...block, [fields[1].key]: ["Changed"] };
  expect(legacyBlockLines(edited)).toEqual(["Before", "Changed", "After", "Two"]);
  expect(edited.kind).toBe("beforeafter");
  expect(legacyBlockFields("product").map((field) => field.key)).toContain("productPrice");
  expect(legacyBlockFields("badges")[0].list).toBe(true);
});

it.each(["navy", "cream"] as const)("renders saved layouts with readable %s theme ink and inline formatting", (theme) => {
  const blocks = [
    { id: "lead", kind: "lead", body: "Hello **reader** {{ first_name }}", align: "left" },
    { id: "before", kind: "beforeafter", beforeLabel: "Before", beforeItems: ["<unsafe>"], afterLabel: "After", afterItems: ["Better"], align: "left" },
  ] as unknown as CampaignBlock[];
  const content = { ...EMAIL_FIXTURES[0].content, theme, blocks };
  const html = renderCampaignEmail(content);
  expect(html).toContain(`color:${resolveTheme(theme).text}`);
  expect(html).toContain("<strong");
  expect(html).toContain("{{ first_name }}");
  expect(html).toContain("&lt;unsafe&gt;");
  expect(html).not.toContain("<p>Hello");
  expect(html).not.toContain("<p>Before");
});
