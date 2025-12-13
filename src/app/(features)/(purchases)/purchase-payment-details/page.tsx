import PurchasePaymentDetail from "@/components/purchase/PurchasePaymentDetail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PurchasePaymentDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const idParam = resolved?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam || "";

  const statusParam = resolved?.status;
  const status = Array.isArray(statusParam) ? statusParam[0] : statusParam || "";
  const supplierParam = resolved?.supplierId;
  const supplierId = Array.isArray(supplierParam)
    ? supplierParam[0]
    : supplierParam || "";
  const startParam = resolved?.startDate;
  const startDate = Array.isArray(startParam) ? startParam[0] : startParam || "";
  const endParam = resolved?.endDate;
  const endDate = Array.isArray(endParam) ? endParam[0] : endParam || "";

  return (
    <PurchasePaymentDetail
      id={id}
      initialStatus={status}
      initialSupplierId={supplierId}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  );
}
