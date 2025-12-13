import BillDetail from "@/components/purchase/BillDetail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BillDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const idParam = resolved?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam || "";
  const poParam = resolved?.purchaseOrderId;
  const purchaseOrderId = Array.isArray(poParam) ? poParam[0] : poParam || "";
  const openPaymentParam = resolved?.openPayment;
  const openPayment = Array.isArray(openPaymentParam)
    ? openPaymentParam[0]
    : openPaymentParam;

  return (
    <BillDetail
      id={id}
      purchaseOrderId={purchaseOrderId}
      autoOpenPayment={openPayment === "1" || openPayment === "true"}
    />
  );
}
