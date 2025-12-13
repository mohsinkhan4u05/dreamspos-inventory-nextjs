import ItemAdjustStockComponent from "@/components/Inventory/item-adjust-stock/itemAdjustStock"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ItemAdjustStockPage({ params }: PageProps) {
  const { id } = await params

  return <ItemAdjustStockComponent itemId={id} />
}
