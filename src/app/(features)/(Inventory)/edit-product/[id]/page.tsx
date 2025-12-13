import EditProductComponent from "@/components/Inventory/edit-product/editproduct";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  return <EditProductComponent productId={id} />;
}
