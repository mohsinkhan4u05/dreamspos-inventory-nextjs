import EditProductComponent from "@/components/Inventory/edit-product/editproduct";

type PageProps = {
  params: {
    id: string;
  };
};

export default function EditProductPage({ params }: PageProps) {
  const { id } = params;

  return <EditProductComponent productId={id} />;
}
