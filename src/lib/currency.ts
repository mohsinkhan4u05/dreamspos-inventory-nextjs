export function formatCurrencyINR(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "\u20b9 0.00";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `\u20b9 ${formatted}`;
}
