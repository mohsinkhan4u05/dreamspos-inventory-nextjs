import PurchaseOrderDetail from "@/components/purchase/PurchaseOrderDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <PurchaseOrderDetail id={id} />;
}
