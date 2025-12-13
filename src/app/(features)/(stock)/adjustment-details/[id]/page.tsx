import AdjustmentDetail from '@/components/stock/stock-adjustment/AdjustmentDetail'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdjustmentDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  return <AdjustmentDetail id={resolvedParams.id} />
}
