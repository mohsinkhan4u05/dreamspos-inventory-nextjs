import SalesOrderDetail from "@/components/sales/sales-order/SalesOrderDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <SalesOrderDetail id={id} />;
}
