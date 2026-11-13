/** Display older/newer saved layouts without changing their stored fields. */
export function legacyBlockLines(block: Record<string, unknown>): string[] {
  const text = (value: unknown): string[] => typeof value === "string" && value.trim() ? [value] : [];
  const list = (value: unknown): string[] => Array.isArray(value) ? value.flatMap(text) : [];
  switch (block.kind) {
    case "beforeafter": return [...text(block.beforeLabel), ...list(block.beforeItems), ...text(block.afterLabel), ...list(block.afterItems)];
    case "badges": return list(block.badges);
    case "product": return [...text(block.productName), ...text(block.productPrice), ...text(block.productComparePrice), ...text(block.productNote), ...text(block.buttonLabel)];
    default: return [...text(block.body)];
  }
}

/** Saved layouts keep their original fields when edited. */
export function legacyBlockFields(kind: string): { key: string; label: string; list?: boolean }[] {
  switch (kind) {
    case "beforeafter": return [
      { key: "beforeLabel", label: "Before heading" }, { key: "beforeItems", label: "Before items", list: true },
      { key: "afterLabel", label: "After heading" }, { key: "afterItems", label: "After items", list: true },
    ];
    case "badges": return [{ key: "badges", label: "Badges", list: true }];
    case "product": return [
      { key: "productName", label: "Product name" }, { key: "productPrice", label: "Price" },
      { key: "productComparePrice", label: "Original price" }, { key: "productNote", label: "Product details" },
      { key: "buttonLabel", label: "Button label" },
    ];
    default: return [];
  }
}
