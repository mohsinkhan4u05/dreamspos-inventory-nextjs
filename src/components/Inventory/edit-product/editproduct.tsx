"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { productService } from "@/services/api";
import { useStores } from "@/hooks/useStores";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { Product } from "@/types/api";
import { all_routes } from "@/data/all_routes";
import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import { ArrowLeft, Info, LifeBuoy } from "react-feather";
import Select from "react-select";
import Link from "next/link";

interface EditProductProps {
  productId: string;
}

export default function EditProductComponent({ productId }: EditProductProps) {
  const route = all_routes;
  const router = useRouter();

  const [storeId, setStoreId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { stores } = useStores({ page: 1, limit: 100, isActive: true });
  const { categories } = useCategories({ page: 1, limit: 100, isActive: true });
  const { brands } = useBrands({ page: 1, limit: 100, isActive: true });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const product = (await productService.getProduct(productId)) as Product;

        setProductName(product.name);
        setSku(product.sku);
        setStoreId(product.storeId);
        setCategoryId(product.categoryId);
        setBrandId(product.brandId || "");
        setPrice(product.sellingPrice.toString());
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load product"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!storeId || !categoryId || !productName || !sku || !price) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    const numericPrice = parseFloat(price);

    if (Number.isNaN(numericPrice)) {
      setSubmitError("Price must be a valid number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await productService.updateProduct(productId, {
        name: productName,
        sku,
        storeId,
        categoryId,
        brandId: brandId || undefined,
        costPrice: numericPrice,
        sellingPrice: numericPrice,
      });

      router.push(route.productlist);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update product"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const storeOptions = [
    { value: "", label: "Choose" },
    ...(stores?.data?.map((s) => ({ value: s.id, label: s.name })) || []),
  ];

  const categoryOptions = [
    { value: "", label: "Choose" },
    ...(categories?.data?.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  const brandOptions = [
    { value: "", label: "Choose" },
    ...(brands?.data?.map((b) => ({ value: b.id, label: b.name })) || []),
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading product</h5>
              <p className="text-muted">{loadError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Edit Product</h4>
                <h6>Update product details</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <RefreshIcon />
              <CollapesIcon />
              <li>
                <div className="page-btn">
                  <Link href={route.productlist} className="btn btn-secondary">
                    <ArrowLeft className="me-2" />
                    Back to Product
                  </Link>
                </div>
              </li>
            </ul>
          </div>

          <form className="add-product-form" onSubmit={handleSubmit}>
            <div className="add-product">
              <div
                className="accordions-items-seperate"
                id="accordionSpacingExample"
              >
                <div className="accordion-item border mb-4">
                  <h2 className="accordion-header" id="headingSpacingOne">
                    <div
                      className="accordion-button collapsed bg-white"
                      data-bs-toggle="collapse"
                      data-bs-target="#SpacingOne"
                      aria-expanded="true"
                      aria-controls="SpacingOne"
                    >
                      <div className="d-flex align-items-center justify-content-between flex-fill">
                        <h5 className="d-flex align-items-center">
                          <Info className="text-primary me-2" />
                          <span>Product Information</span>
                        </h5>
                      </div>
                    </div>
                  </h2>
                  <div
                    id="SpacingOne"
                    className="accordion-collapse collapse show"
                    aria-labelledby="headingSpacingOne"
                  >
                    <div className="accordion-body border-top">
                      <div className="row">
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Store<span className="text-danger ms-1">*</span>
                            </label>
                            <Select
                              className="react-select"
                              options={storeOptions}
                              placeholder="Choose"
                              value={
                                storeOptions.find((o) => o.value === storeId) ||
                                storeOptions[0]
                              }
                              onChange={(option) =>
                                setStoreId(
                                  (option as { value: string; label: string } | null)
                                    ?.value || ""
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Product Name
                              <span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-sm-6 col-12">
                          <div className="mb-3 list position-relative">
                            <label className="form-label">
                              SKU<span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control list"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="addservice-info">
                        <div className="row">
                          <div className="col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">
                                Category
                                <span className="text-danger ms-1">*</span>
                              </label>
                              <Select
                                className="react-select"
                                options={categoryOptions}
                                placeholder="Choose"
                                value={
                                  categoryOptions.find(
                                    (o) => o.value === categoryId
                                  ) || categoryOptions[0]
                                }
                                onChange={(option) =>
                                  setCategoryId(
                                    (option as { value: string; label: string } | null)
                                      ?.value || ""
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">
                                Brand
                                <span className="text-danger ms-1">*</span>
                              </label>
                              <Select
                                className="react-select"
                                options={brandOptions}
                                placeholder="Choose"
                                value={
                                  brandOptions.find((o) => o.value === brandId) ||
                                  brandOptions[0]
                                }
                                onChange={(option) =>
                                  setBrandId(
                                    (option as { value: string; label: string } | null)
                                      ?.value || ""
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="accordion-item border mb-4">
                  <h2 className="accordion-header" id="headingSpacingTwo">
                    <div
                      className="accordion-button collapsed bg-white"
                      data-bs-toggle="collapse"
                      data-bs-target="#SpacingTwo"
                      aria-expanded="true"
                      aria-controls="SpacingTwo"
                    >
                      <div className="d-flex align-items-center justify-content-between flex-fill">
                        <h5 className="d-flex align-items-center">
                          <LifeBuoy className="text-primary me-2" />
                          <span>Pricing</span>
                        </h5>
                      </div>
                    </div>
                  </h2>
                  <div
                    id="SpacingTwo"
                    className="accordion-collapse collapse show"
                    aria-labelledby="headingSpacingTwo"
                  >
                    <div className="accordion-body border-top">
                      <div className="row">
                        <div className="col-lg-4 col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Price
                              <span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-12">
              {submitError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {submitError}
                </div>
              )}
              <div className="d-flex align-items-center justify-content-end mb-4">
                <button type="button" className="btn btn-secondary me-2">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Update Product"}
                </button>
              </div>
            </div>
          </form>
        </div>
        <CommonFooter />
      </div>
    </>
  );
}
