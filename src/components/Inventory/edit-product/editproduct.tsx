"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { productService } from "@/services/api";
import { useBrands } from "@/hooks/useBrands";
import { useUnits } from "@/hooks/useUnits";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Product } from "@/types/api";
import { all_routes } from "@/data/all_routes";
import CommonFooter from "@/core/common/footer/commonFooter";
import TextEditor from "@/core/common/texteditor/texteditor";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import AddBrand from "@/core/modals/inventory/addbrand";
import Addunits from "@/core/modals/inventory/addunits";
import { ArrowLeft, Info, LifeBuoy, X, Image, PlusCircle } from "react-feather";
import Select from "react-select";
import Link from "next/link";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

interface EditProductProps {
  productId: string;
}

type ProductWithRelations = Product & {
  brandId?: string | null;
};

export default function EditProductComponent({ productId }: EditProductProps) {
  const route = all_routes;
  const router = useRouter();

  const [brandId, setBrandId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [preferredVendorId, setPreferredVendorId] = useState<string>("");

  const [productName, setProductName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [itemType, setItemType] = useState<"GOODS" | "SERVICE">("GOODS");
  const [returnable, setReturnable] = useState<boolean>(false);

  const [lengthValue, setLengthValue] = useState<string>("");
  const [widthValue, setWidthValue] = useState<string>("");
  const [heightValue, setHeightValue] = useState<string>("");
  const [dimensionUnit, setDimensionUnit] = useState<string>("cm");

  const [weightValue, setWeightValue] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<string>("kg");

  const [manufacturer, setManufacturer] = useState<string>("");

  const [sellable, setSellable] = useState<boolean>(true);
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [salesAccount, setSalesAccount] = useState<string>("Sales");
  const [salesDescription, setSalesDescription] = useState<string>("");

  const [purchasable, setPurchasable] = useState<boolean>(true);
  const [costPrice, setCostPrice] = useState<string>("");
  const [purchaseAccount, setPurchaseAccount] = useState<string>(
    "Cost of Goods Sold"
  );
  const [purchaseDescription, setPurchaseDescription] = useState<string>("");

  const [trackInventory, setTrackInventory] = useState<boolean>(true);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { brands } = useBrands({ page: 1, limit: 100, isActive: true });
  const { units } = useUnits({ page: 1, limit: 100, isActive: true });
  const { suppliers } = useSuppliers({ page: 1, limit: 100, isActive: true });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const product = (await productService.getProduct(
          productId,
        )) as ProductWithRelations;

        setProductName(product.name);
        setSku(product.sku ?? "");
        setBrandId(product.brandId ?? "");
        setReturnable(product.returnable ?? false);

        setLengthValue(
          typeof product.length === "number" ? product.length.toString() : ""
        );
        setWidthValue(
          typeof product.width === "number" ? product.width.toString() : ""
        );
        setHeightValue(
          typeof product.height === "number" ? product.height.toString() : ""
        );
        setDimensionUnit(product.dimensionUnit || "cm");

        setWeightValue(
          typeof product.weight === "number" ? product.weight.toString() : ""
        );
        setWeightUnit(product.weightUnit || "kg");

        setManufacturer(product.manufacturer || "");

        setSellable(product.sellable ?? true);
        setSellingPrice(
          typeof product.sellingPrice === "number"
            ? product.sellingPrice.toString()
            : ""
        );
        setSalesAccount(product.salesAccount || "Sales");
        setSalesDescription(product.salesDescription || "");

        setPurchasable(product.purchasable ?? true);
        setCostPrice(
          typeof product.costPrice === "number"
            ? product.costPrice.toString()
            : ""
        );
        setPurchaseAccount(product.purchaseAccount || "Cost of Goods Sold");
        setPurchaseDescription(product.purchaseDescription || "");

        setPreferredVendorId(product.preferredVendorId || "");
        setTrackInventory(product.trackInventory ?? true);

        setUnitId(product.unitId || "");
        setImageUrl(product.image || null);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load Item"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productName) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    if (itemType === "GOODS" && !unitId) {
      setSubmitError("Unit is required for goods items.");
      return;
    }

    let numericSellingPrice = 0;
    if (sellingPrice) {
      numericSellingPrice = parseFloat(sellingPrice);
      if (Number.isNaN(numericSellingPrice)) {
        setSubmitError("Selling price must be a valid number.");
        return;
      }
    } else if (sellable) {
      setSubmitError("Selling price is required when item is sellable.");
      return;
    }

    let numericCostPrice = 0;
    if (costPrice) {
      numericCostPrice = parseFloat(costPrice);
      if (Number.isNaN(numericCostPrice)) {
        setSubmitError("Cost price must be a valid number.");
        return;
      }
    } else if (purchasable) {
      setSubmitError("Cost price is required when item is purchasable.");
      return;
    }

    const lengthNum = lengthValue ? parseFloat(lengthValue) : undefined;
    const widthNum = widthValue ? parseFloat(widthValue) : undefined;
    const heightNum = heightValue ? parseFloat(heightValue) : undefined;
    const weightNum = weightValue ? parseFloat(weightValue) : undefined;

    if (
      (lengthValue && Number.isNaN(lengthNum!)) ||
      (widthValue && Number.isNaN(widthNum!)) ||
      (heightValue && Number.isNaN(heightNum!))
    ) {
      setSubmitError("Dimensions must be valid numbers.");
      return;
    }

    if (weightValue && Number.isNaN(weightNum!)) {
      setSubmitError("Weight must be a valid number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload: Partial<Product> = {
        name: productName,
        sku: sku || undefined,
        brandId: brandId || undefined,
        image: imageUrl || undefined,
        costPrice: numericCostPrice,
        sellingPrice: numericSellingPrice,
        itemType,
        unitId: unitId || undefined,
        returnable,
        length: lengthNum,
        width: widthNum,
        height: heightNum,
        dimensionUnit: dimensionUnit || undefined,
        weight: weightNum,
        weightUnit: weightUnit || undefined,
        manufacturer: manufacturer || undefined,
        sellable,
        purchasable,
        salesDescription: salesDescription || undefined,
        purchaseDescription: purchaseDescription || undefined,
        preferredVendorId: preferredVendorId || undefined,
        salesAccount: salesAccount || undefined,
        purchaseAccount: purchaseAccount || undefined,
        trackInventory,
      };

      await productService.updateProduct(productId, payload);

      router.push(route.productlist);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update Item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const brandOptions = [
    { value: "", label: "Choose" },
    ...(brands?.data?.map((b) => ({ value: b.id, label: b.name })) || []),
  ];

  const unitOptions = [
    { value: "", label: "Select or type to add" },
    ...(units?.data?.map((unitItem) => ({
      value: unitItem.id,
      label: unitItem.name,
    })) || []),
  ];

  const preferredVendorOptions = [
    { value: "", label: "Select Vendor" },
    ...(suppliers?.data?.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
    })) || []),
  ];

  const salesAccountOptions = [
    { value: "", label: "Select an account" },
    { value: "Sales", label: "Sales" },
    { value: "Sales - Domestic", label: "Sales - Domestic" },
    { value: "Sales - Export", label: "Sales - Export" },
  ];

  const purchaseAccountOptions = [
    { value: "", label: "Select an account" },
    { value: "Cost of Goods Sold", label: "Cost of Goods Sold" },
    { value: "Purchases", label: "Purchases" },
    { value: "Expenses", label: "Expenses" },
  ];

  const dimensionUnitOptions = [
    { value: "cm", label: "cm" },
    { value: "inch", label: "inch" },
    { value: "ft", label: "ft" },
  ];

  const weightUnitOptions = [
    { value: "kg", label: "kg" },
    { value: "g", label: "g" },
    { value: "lb", label: "lb" },
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
              <h5 className="text-danger">Error loading Item</h5>
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
                <h4>Edit Item</h4>
                <h6>Update item details</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <RefreshIcon />
              <CollapesIcon />
              <li>
                <div className="page-btn">
                  <Link href={route.productlist} className="btn btn-secondary">
                    <ArrowLeft className="me-2" />
                    Back to Item
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
                          <span>Item Information</span>
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
                              Name<span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-sm-6 col-12">
                          <div className="mb-3 list">
                            <label className="form-label">SKU</label>
                            <input
                              type="text"
                              className="form-control"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Unit
                              {itemType === "GOODS" && (
                                <span className="text-danger ms-1">*</span>
                              )}
                            </label>
                            <Select
                              className="react-select"
                              options={unitOptions}
                              placeholder="Select or type to add"
                              value={
                                unitOptions.find(
                                  (option) => option.value === unitId
                                ) || unitOptions[0]
                              }
                              onChange={(option) =>
                                setUnitId(
                                  (option as { value: string; label: string } | null)
                                    ?.value || ""
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="col-sm-6 col-12">
                          <div className="form-check mt-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="returnableItem"
                              checked={returnable}
                              onChange={(e) => setReturnable(e.target.checked)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor="returnableItem"
                            >
                              Returnable Item
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Dimensions (Length x Width x Height)
                            </label>
                            <div className="d-flex align-items-center">
                              <input
                                type="text"
                                className="form-control me-1"
                                value={lengthValue}
                                onChange={(e) => setLengthValue(e.target.value)}
                              />
                              <span className="mx-1">x</span>
                              <input
                                type="text"
                                className="form-control me-1"
                                value={widthValue}
                                onChange={(e) => setWidthValue(e.target.value)}
                              />
                              <span className="mx-1">x</span>
                              <input
                                type="text"
                                className="form-control me-2"
                                value={heightValue}
                                onChange={(e) => setHeightValue(e.target.value)}
                              />
                              <select
                                className="form-select w-auto"
                                value={dimensionUnit}
                                onChange={(e) => setDimensionUnit(e.target.value)}
                              >
                                {dimensionUnitOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Weight</label>
                            <div className="d-flex align-items-center">
                              <input
                                type="text"
                                className="form-control me-2"
                                value={weightValue}
                                onChange={(e) => setWeightValue(e.target.value)}
                              />
                              <select
                                className="form-select w-auto"
                                value={weightUnit}
                                onChange={(e) => setWeightUnit(e.target.value)}
                              >
                                {weightUnitOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Manufacturer</label>
                            <input
                              type="text"
                              className="form-control"
                              value={manufacturer}
                              onChange={(e) => setManufacturer(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6 col-12">
                          <div className="mb-3">
                            <div className="add-newplus">
                              <label className="form-label">Brand</label>
                            </div>
                            <Select
                              className="react-select"
                              options={brandOptions}
                              placeholder="Choose"
                              value={
                                brandOptions.find(
                                  (option) => option.value === brandId
                                ) || brandOptions[0]
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
                      <div className="col-lg-12">
                        <div className="summer-description-box">
                          <label className="form-label">Description</label>
                          <TextEditor />
                          <p className="fs-14 mt-1">Maximum 60 Words</p>
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
                          <span>Sales &amp; Purchase Information</span>
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
                        <div className="col-lg-6 col-12 border-end">
                          <h6 className="mb-3 d-flex align-items-center">
                            <span className="me-2">Sales Information</span>
                            <div className="form-check ms-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="sellable"
                                checked={sellable}
                                onChange={(e) => setSellable(e.target.checked)}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="sellable"
                              >
                                Sellable
                              </label>
                            </div>
                          </h6>
                          <div className="mb-3">
                            <label className="form-label">
                              Selling Price
                              {sellable && (
                                <span className="text-danger ms-1">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={sellingPrice}
                              onChange={(e) => setSellingPrice(e.target.value)}
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Account</label>
                            <Select
                              className="react-select"
                              options={salesAccountOptions}
                              placeholder="Select an account"
                              value={
                                salesAccountOptions.find(
                                  (option) => option.value === salesAccount
                                ) || salesAccountOptions[0]
                              }
                              onChange={(option) =>
                                setSalesAccount(
                                  (option as { value: string; label: string } | null)
                                    ?.value || ""
                                )
                              }
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={salesDescription}
                              onChange={(e) => setSalesDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6 col-12">
                          <h6 className="mb-3 d-flex align-items-center">
                            <span className="me-2">Purchase Information</span>
                            <div className="form-check ms-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="purchasable"
                                checked={purchasable}
                                onChange={(e) => setPurchasable(e.target.checked)}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="purchasable"
                              >
                                Purchasable
                              </label>
                            </div>
                          </h6>
                          <div className="mb-3">
                            <label className="form-label">
                              Cost Price
                              {purchasable && (
                                <span className="text-danger ms-1">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={costPrice}
                              onChange={(e) => setCostPrice(e.target.value)}
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Account</label>
                            <Select
                              className="react-select"
                              options={purchaseAccountOptions}
                              placeholder="Select an account"
                              value={
                                purchaseAccountOptions.find(
                                  (option) => option.value === purchaseAccount
                                ) || purchaseAccountOptions[0]
                              }
                              onChange={(option) =>
                                setPurchaseAccount(
                                  (option as { value: string; label: string } | null)
                                    ?.value || ""
                                )
                              }
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={purchaseDescription}
                              onChange={(e) =>
                                setPurchaseDescription(e.target.value)
                              }
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Preferred Vendor</label>
                            <Select
                              className="react-select"
                              options={preferredVendorOptions}
                              placeholder="Select Vendor"
                              value={
                                preferredVendorOptions.find(
                                  (option) => option.value === preferredVendorId
                                ) || preferredVendorOptions[0]
                              }
                              onChange={(option) =>
                                setPreferredVendorId(
                                  (option as { value: string; label: string } | null)
                                    ?.value || ""
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <hr className="my-4" />
                      <div className="row">
                        <div className="col-12">
                          <div className="form-check mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="trackInventory"
                              checked={trackInventory}
                              onChange={(e) => setTrackInventory(e.target.checked)}
                            />
                            <label
                              className="form-check-label fw-semibold"
                              htmlFor="trackInventory"
                            >
                              Track Inventory for this item
                            </label>
                          </div>
                          <p className="text-muted fs-12 mb-3">
                            You cannot enable/disable inventory tracking once you
                            have created transactions for this item.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="accordion-item border mb-4">
                  <h2 className="accordion-header" id="headingSpacingThree">
                    <div
                      className="accordion-button collapsed bg-white"
                      data-bs-toggle="collapse"
                      data-bs-target="#SpacingThree"
                      aria-expanded="true"
                      aria-controls="SpacingThree"
                    >
                      <div className="d-flex align-items-center justify-content-between flex-fill">
                        <h5 className="d-flex align-items-center">
                          <Image className="text-primary me-2" />
                          <span>Images</span>
                        </h5>
                      </div>
                    </div>
                  </h2>
                  <div
                    id="SpacingThree"
                    className="accordion-collapse collapse show"
                    aria-labelledby="headingSpacingThree"
                  >
                    <div className="accordion-body border-top">
                      <div className="text-editor add-list add">
                        <div className="col-lg-12">
                          <div className="add-choosen">
                            <div className="mb-3">
                              <div className="image-upload d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3">
                                <UploadButton<OurFileRouter, "productImages">
                                  endpoint="productImages"
                                  onClientUploadComplete={(res) => {
                                    const file = res?.[0];
                                    if (file?.url) {
                                      setImageUrl(file.url);
                                      setImageUploadError(null);
                                    }
                                  }}
                                  onUploadError={(error) => {
                                    setImageUploadError(error.message);
                                  }}
                                />
                                {imageUploadError && (
                                  <div className="text-danger small mt-2 mt-sm-0">
                                    {imageUploadError}
                                  </div>
                                )}
                              </div>
                            </div>
                            {imageUrl && (
                              <div className="phone-img">
                                <img src={imageUrl} alt="Product" />
                                <Link href="#">
                                  <X
                                    className="x-square-add remove-product"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setImageUrl(null);
                                    }}
                                  />
                                </Link>
                              </div>
                            )}
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
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="me-2" /> Update Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
        <CommonFooter />
      </div>
      <Addunits />
      <AddBrand />
    </>
  );
}
