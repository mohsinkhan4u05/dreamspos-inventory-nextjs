import { Prisma } from "@prisma/client";

export type VariantOptionInput = {
  name: string;
  values: string[];
  position: number;
};

export type GeneratedVariantCombo = {
  title: string;
  optionValues: Record<string, string>;
};

export function generateVariantCombos(options: VariantOptionInput[]): GeneratedVariantCombo[] {
  const sorted = [...options]
    .filter((opt) => opt.values.length > 0)
    .sort((a, b) => a.position - b.position);

  if (sorted.length === 0) return [];

  // Cartesian product over values arrays
  const combos: string[][] = sorted.reduce<string[][]>((acc, option) => {
    if (acc.length === 0) {
      return option.values.map((v) => [v]);
    }
    const next: string[][] = [];
    for (const prefix of acc) {
      for (const value of option.values) {
        next.push([...prefix, value]);
      }
    }
    return next;
  }, []);

  // Enforce 2048 max variants per product
  if (combos.length > 2048) {
    throw new Error("Variant limit exceeded: maximum 2048 variants per product");
  }

  return combos.map((values) => {
    const optionValues: Record<string, string> = {};
    values.forEach((value, idx) => {
      const optionName = sorted[idx]?.name ?? `Option ${idx + 1}`;
      optionValues[optionName] = value;
    });

    return {
      title: values.join(" / "),
      optionValues,
    };
  });
}

export function buildVariantCreateManyInputs(
  productId: string,
  baseSkuPrefix: string | null,
  combos: GeneratedVariantCombo[],
  detailsByTitle?: Map<string, { costPrice: number; sellingPrice: number }>,
): Prisma.ProductVariantCreateManyInput[] {
  return combos.map((combo, index) => {
    const detail = detailsByTitle?.get(combo.title);

    return {
      productId,
      name: combo.title,
      sku: generateSku(baseSkuPrefix, combo.optionValues, index),
      sellingPrice: detail?.sellingPrice ?? 0,
      costPrice: detail?.costPrice ?? null,
      isActive: true,
    };
  });
}

export function generateSku(
  baseSkuPrefix: string | null,
  optionValues: Record<string, string>,
  index: number,
): string | null {
  const base = (baseSkuPrefix ?? "").trim();
  const normalizedPieces = Object.values(optionValues).map((v) =>
    v
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 6),
  );

  const suffix = normalizedPieces.filter(Boolean).join("-") || String(index + 1);

  if (!base && !suffix) {
    return null;
  }

  if (!base) {
    return suffix;
  }

  return `${base}-${suffix}`;
}
