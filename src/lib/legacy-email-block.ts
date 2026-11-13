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
