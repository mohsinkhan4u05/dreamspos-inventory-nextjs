import PurchaseOrderConvertToBill from "@/components/purchase/PurchaseOrderConvertToBill";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseOrderConvertToBillPage({
  params,
}: PageProps) {
  const { id } = await params;

  return <PurchaseOrderConvertToBill id={id} />;
}
