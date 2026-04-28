/** Shallow string diff of two JSON objects (keys one level, nested as JSON). */
export function diffJsonObject(a: Record<string, unknown>, b: Record<string, unknown>): string {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const lines: string[] = [];
  keys.forEach((k) => {
    const va = a[k] !== undefined ? JSON.stringify(a[k]) : "—";
    const vb = b[k] !== undefined ? JSON.stringify(b[k]) : "—";
    if (va !== vb) {
      lines.push(`${k}:\n  было:  ${va}\n  стало: ${vb}`);
    }
  });
  return lines.length > 0 ? lines.join("\n\n") : "(нет отличий по верхнему уровню)";
}
