import ItemDetailComponent from "@/components/Inventory/item-detail/itemdetail"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params

  return <ItemDetailComponent itemId={id} />
}
