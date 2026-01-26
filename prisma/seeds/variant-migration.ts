import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateProductVariants() {
  console.log("🚀 Starting product variant migration...");

  const products = await prisma.product.findMany({
    include: {
      variants: true,
    },
  });

  console.log(`Found ${products.length} products to process`);

  for (const product of products) {
    await prisma.$transaction(async (tx) => {
      // 1) Determine or create default variant for this product
      let defaultVariant = product.variants.find((v) => v.name === product.name) ?? product.variants[0];

      if (!defaultVariant) {
        defaultVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            name: product.name,
            sku: product.sku ?? null,
            costPrice: product.costPrice ?? null,
            sellingPrice: product.sellingPrice ?? null,
            image: product.image ?? null,
            isActive: product.isActive,
          },
        });

        console.log(`Created default variant for product ${product.id} (${product.name})`);
      }

      // 2) Mark product as variant-enabled
      if (!product.isVariant) {
        await tx.product.update({
          where: { id: product.id },
          data: { isVariant: true },
        });
      }

      // 3) Backfill variantId on related records that currently only reference productId
      const whereByProductNoVariant = {
        productId: product.id,
        variantId: null,
      } as const;

      await Promise.all([
        tx.stock.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.stockLayer.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.itemBatch.updateMany({
          where: {
            productId: product.id,
            variantId: null,
          },
          data: { variantId: defaultVariant.id },
        }),
        tx.saleItem.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.salesOrderItem.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.packageItem.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.shipmentItem.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
        tx.purchaseOrderItem.updateMany({
          where: whereByProductNoVariant,
          data: { variantId: defaultVariant.id },
        }),
      ]);
    });
  }

  console.log("✅ Product variant migration completed successfully");
}

if (require.main === module) {
  migrateProductVariants()
    .catch((err) => {
      console.error("❌ Error during product variant migration", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { migrateProductVariants };
