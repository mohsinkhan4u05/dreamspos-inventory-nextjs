import PaymentDetail from "@/components/sales/payments/PaymentDetail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaymentDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const idParam = resolved?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam || "";

  return <PaymentDetail id={id} />;
}
