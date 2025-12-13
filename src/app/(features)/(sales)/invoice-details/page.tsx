import InvoiceDetail from "@/components/sales/invoice/InvoiceDetail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InvoiceDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const idParam = resolved?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam || "";

  return <InvoiceDetail id={id} />;
}
