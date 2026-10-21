/** Stable keys for immutable text lists, including repeated observations. */
export function textRows(values: string[]) {
  const seen = new Map<string, number>();
  return values.map((value) => {
    const occurrence = seen.get(value) ?? 0;
    seen.set(value, occurrence + 1);
    return { key: `${value}:${occurrence}`, value };
  });
}
