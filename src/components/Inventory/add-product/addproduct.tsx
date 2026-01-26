"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import TextEditor from "@/core/common/texteditor/texteditor";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import AddBrand from "@/core/modals/inventory/addbrand";
import Addunits from "@/core/modals/inventory/addunits";
import { all_routes } from "@/data/all_routes";
import {
  ArrowLeft,
  Info,
  LifeBuoy,
  PlusCircle,
  X,
  Image,
} from "react-feather";
import Link from "next/link";
import { useState, useMemo, useEffect, FormEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { productService } from "@/services/api";
import { useBrands } from "@/hooks/useBrands";
import { useUnits } from "@/hooks/useUnits";
import { useSuppliers } from "@/hooks/useSuppliers";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export default function AddProductComponent() {
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

  const [isVariantProduct, setIsVariantProduct] = useState<boolean>(false);
  const [variantOptions, setVariantOptions] = useState<
    { id: string; name: string; values: string[]; position: number; newValue: string }[]
  >([]);

  const [variantRows, setVariantRows] = useState<
    Record<string, { costPrice: string; sellingPrice: string; quantity: string }>
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const { brands } = useBrands({ page: 1, limit: 100, isActive: true });
  const { units } = useUnits({ page: 1, limit: 100, isActive: true });
  const { suppliers } = useSuppliers({ page: 1, limit: 100, isActive: true });

  const forcedVariantGoods = itemType === "GOODS" && trackInventory;

  useEffect(() => {
    if (forcedVariantGoods) {
      setIsVariantProduct(true);
    }
  }, [forcedVariantGoods]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productName) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    const shouldUseVariants = forcedVariantGoods;

    let numericSellingPrice = 0;
    let numericCostPrice = 0;

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

    let preparedVariantOptions:
      | { name: string; values: string[]; position: number }[]
      | undefined;
    let variantDetails:
      | { title: string; costPrice: number; sellingPrice: number; quantity: number }[]
      | undefined;

    if (shouldUseVariants) {
      preparedVariantOptions = variantOptions
        .map((option, index) => ({
          name: option.name.trim(),
          values: option.values.map((v) => v.trim()).filter(Boolean),
          position: index,
        }))
        .filter((option) => option.name && option.values.length > 0);

      if (!preparedVariantOptions.length) {
        setSubmitError("Add at least one option and value for variant items.");
        return;
      }

      if (!variantPreviewTitles.length) {
        setSubmitError("Add at least one variant to this item.");
        return;
      }

      const details: {
        title: string;
        costPrice: number;
        sellingPrice: number;
        quantity: number;
      }[] = [];

      for (const title of variantPreviewTitles) {
        const row = variantRows[title];

        if (!row || !row.costPrice || !row.sellingPrice || !row.quantity) {
          setSubmitError(
            "Enter cost price, selling price, and available quantity for all variants.",
          );
          return;
        }

        const variantCost = parseFloat(row.costPrice);
        const variantSell = parseFloat(row.sellingPrice);
        const variantQty = parseFloat(row.quantity);

        if (
          Number.isNaN(variantCost) ||
          Number.isNaN(variantSell) ||
          Number.isNaN(variantQty)
        ) {
          setSubmitError("Variant prices and quantities must be valid numbers.");
          return;
        }

        details.push({
          title,
          costPrice: variantCost,
          sellingPrice: variantSell,
          quantity: variantQty,
        });
      }

      if (!details.length) {
        setSubmitError("Add at least one variant with pricing and quantity.");
        return;
      }

      variantDetails = details;

      // Use the first variant's pricing as the base product price to satisfy schema
      numericCostPrice = details[0].costPrice;
      numericSellingPrice = details[0].sellingPrice;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await productService.createProduct({
        name: productName,
        sku: sku || undefined,
        brandId: brandId || undefined,
        image: imageUrl || undefined,
        costPrice: numericCostPrice,
        sellingPrice: numericSellingPrice,
        isActive: true,
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
        ...(shouldUseVariants && preparedVariantOptions && variantDetails
          ? {
              isVariant: true,
              variantOptions: preparedVariantOptions,
              baseSkuPrefix: sku || productName || undefined,
              variantDetails,
            }
          : {}),
      });

      router.push(route.productlist);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  const brand = [
    { value: "", label: "Choose" },
    ...(brands?.data?.map((brandItem) => ({
      value: brandItem.id,
      label: brandItem.name,
    })) || []),
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

  const [isImageVisible, setIsImageVisible] = useState(true);

  const handleRemoveProduct = () => {
    setIsImageVisible(false);
  };
  const [isImageVisible1, setIsImageVisible1] = useState(true);

  const handleRemoveProduct1 = () => {
    setIsImageVisible1(false);
  };

  const handleAddVariantOption = () => {
    setVariantOptions((previous) => {
      if (previous.length >= 3) {
        return previous;
      }
      const index = previous.length;
      return [
        ...previous,
        {
          id: `${Date.now()}-${index}`,
          name: index === 0 ? "Size" : "",
          values: [],
          position: index,
          newValue: "",
        },
      ];
    });
  };

  const handleVariantOptionNameChange = (id: string, value: string) => {
    setVariantOptions((previous) =>
      previous.map((option) =>
        option.id === id ? { ...option, name: value } : option
      )
    );
  };

  const handleVariantNewValueChange = (id: string, value: string) => {
    setVariantOptions((previous) =>
      previous.map((option) =>
        option.id === id ? { ...option, newValue: value } : option
      )
    );
  };

  const handleVariantAddValue = (id: string) => {
    setVariantOptions((previous) =>
      previous.map((option) => {
        if (option.id !== id) {
          return option;
        }
        const value = option.newValue.trim();
        if (!value || option.values.includes(value)) {
          return option;
        }
        return {
          ...option,
          values: [...option.values, value],
          newValue: "",
        };
      })
    );
  };

  const handleVariantRemoveValue = (id: string, valueToRemove: string) => {
    setVariantOptions((previous) =>
      previous.map((option) =>
        option.id === id
          ? {
              ...option,
              values: option.values.filter((value) => value !== valueToRemove),
            }
          : option
      )
    );
  };

  const handleRemoveVariantOption = (id: string) => {
    setVariantOptions((previous) =>
      previous
        .filter((option) => option.id !== id)
        .map((option, index) => ({ ...option, position: index }))
    );
  };

  const variantPreviewTitles = useMemo(() => {
    if (!isVariantProduct || itemType !== "GOODS" || !trackInventory) {
      return [] as string[];
    }

    const cleaned = variantOptions
      .map((option) => ({
        name: option.name.trim(),
        values: option.values.map((value) => value.trim()).filter(Boolean),
      }))
      .filter((option) => option.name && option.values.length > 0);

    if (!cleaned.length) {
      return [] as string[];
    }

    let combos: string[][] = [[]];

    for (const option of cleaned) {
      const next: string[][] = [];
      for (const prefix of combos) {
        for (const value of option.values) {
          next.push([...prefix, value]);
        }
      }
      combos = next;
      if (combos.length > 2048) {
        return [] as string[];
      }
    }

    return combos.map((combo) => combo.join(" / "));
  }, [isVariantProduct, itemType, trackInventory, variantOptions]);

  useEffect(() => {
    if (!isVariantProduct || itemType !== "GOODS" || !trackInventory) {
      setVariantRows({});
      return;
    }

    setVariantRows((previous) => {
      const next: Record<
        string,
        { costPrice: string; sellingPrice: string; quantity: string }
      > = {};

      for (const title of variantPreviewTitles) {
        const existing = previous[title];
        next[title] = existing || {
          costPrice: "",
          sellingPrice: "",
          quantity: "",
        };
      }

      return next;
    });
  }, [isVariantProduct, itemType, trackInventory, variantPreviewTitles]);
  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Create Item</h4>
                <h6>Create new Item</h6>
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
          {/* /add */}
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
                          {false && (
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
                          )}
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
                      {false && (
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
                      )}
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
                              options={brand}
                              placeholder="Choose"
                              value={
                                brand.find((option) => option.value === brandId) ||
                                brand[0]
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
                      {/* Editor */}
                      <div className="col-lg-12">
                        <div className="summer-description-box">
                          <label className="form-label">Description</label>
                          <TextEditor />
                          <p className="fs-14 mt-1">Maximum 60 Words</p>
                        </div>
                      </div>
                      {/* /Editor */}
                    </div>
                  </div>
                </div>
                {false && (
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
                            <LifeBuoy
                              data-feather="life-buoy"
                              className="text-primary me-2"
                            />
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
                        {/* Sales & Purchase content hidden */}
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
                )}
                <div className="accordion-item border mb-4">
                  <h2 className="accordion-header" id="headingVariants">
                    <div
                      className="accordion-button collapsed bg-white"
                      data-bs-toggle="collapse"
                      data-bs-target="#SpacingVariants"
                      aria-expanded="true"
                      aria-controls="SpacingVariants"
                    >
                      <div className="d-flex align-items-center justify-content-between flex-fill">
                        <h5 className="d-flex align-items-center">
                          <span className="me-2">Variants</span>
                        </h5>
                      </div>
                    </div>
                  </h2>
                  <div
                    id="SpacingVariants"
                    className="accordion-collapse collapse show"
                    aria-labelledby="headingVariants"
                  >
                    <div className="accordion-body border-top">
                      <div className="row">
                        <div className="col-12">
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="isVariantProduct"
                              checked={forcedVariantGoods ? true : isVariantProduct}
                              disabled={
                                forcedVariantGoods || itemType !== "GOODS" || !trackInventory
                              }
                              onChange={(e) => {
                                if (forcedVariantGoods) {
                                  return;
                                }
                                const checked = e.target.checked;
                                setIsVariantProduct(checked);
                                if (checked) {
                                  setVariantOptions((previous) => {
                                    if (previous.length > 0) {
                                      return previous;
                                    }
                                    return [
                                      {
                                        id: `${Date.now()}-0`,
                                        name: "Size",
                                        values: [],
                                        position: 0,
                                        newValue: "",
                                      },
                                    ];
                                  });
                                }
                              }}
                            />
                            <label
                              className="form-check-label"
                              htmlFor="isVariantProduct"
                            >
                              This item has multiple options, like size or color
                            </label>
                          </div>
                        </div>
                      </div>
                      {isVariantProduct && itemType === "GOODS" && trackInventory && (
                        <>
                          <div className="mb-3 d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">Options</span>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={handleAddVariantOption}
                              disabled={variantOptions.length >= 3}
                            >
                              Add another option
                            </button>
                          </div>
                          {variantOptions.length === 0 && (
                            <p className="text-muted fs-12 mb-3">
                              Add at least one option with values to generate variants.
                            </p>
                          )}
                          {variantOptions.map((option, index) => (
                            <div key={option.id} className="mb-3">
                              <div className="d-flex align-items-center mb-2">
                                <div className="me-2">
                                  <span className="badge bg-light text-dark">Option {index + 1}</span>
                                </div>
                                <input
                                  type="text"
                                  className="form-control"
                                  style={{ maxWidth: "240px" }}
                                  placeholder="Option name (e.g. Size)"
                                  value={option.name}
                                  onChange={(e) =>
                                    handleVariantOptionNameChange(option.id, e.target.value)
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn btn-link text-danger ms-2 p-0"
                                  onClick={() => handleRemoveVariantOption(option.id)}
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                {option.values.map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                                    onClick={() => handleVariantRemoveValue(option.id, value)}
                                  >
                                    <span className="me-1">{value}</span>
                                    <span aria-hidden="true">×</span>
                                  </button>
                                ))}
                              </div>
                              <div className="d-flex align-items-center" style={{ maxWidth: "360px" }}>
                                <input
                                  type="text"
                                  className="form-control me-2"
                                  placeholder="Add a value (e.g. 10 gms)"
                                  value={option.newValue}
                                  onChange={(e) =>
                                    handleVariantNewValueChange(option.id, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleVariantAddValue(option.id);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleVariantAddValue(option.id)}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                          {variantPreviewTitles.length > 0 && (
                            <div className="mt-3">
                              <span className="fw-semibold d-block mb-2">Variants</span>
                              <div className="table-responsive">
                                <table className="table table-bordered align-middle">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "40%" }}>Variant</th>
                                      <th style={{ width: "20%" }}>Cost Price</th>
                                      <th style={{ width: "20%" }}>Selling Price</th>
                                      <th style={{ width: "20%" }}>Available Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {variantPreviewTitles.slice(0, 50).map((title) => {
                                      const row = variantRows[title] || {
                                        costPrice: "",
                                        sellingPrice: "",
                                        quantity: "",
                                      };

                                      return (
                                        <tr key={title}>
                                          <td>{title}</td>
                                          <td>
                                            <input
                                              type="text"
                                              className="form-control form-control-sm"
                                              value={row.costPrice}
                                              onChange={(e) =>
                                                setVariantRows((previous) => ({
                                                  ...previous,
                                                  [title]: {
                                                    ...previous[title],
                                                    costPrice: e.target.value,
                                                    sellingPrice:
                                                      previous[title]?.sellingPrice || "",
                                                    quantity:
                                                      previous[title]?.quantity || "",
                                                  },
                                                }))
                                              }
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              className="form-control form-control-sm"
                                              value={row.sellingPrice}
                                              onChange={(e) =>
                                                setVariantRows((previous) => ({
                                                  ...previous,
                                                  [title]: {
                                                    ...previous[title],
                                                    costPrice:
                                                      previous[title]?.costPrice || "",
                                                    sellingPrice: e.target.value,
                                                    quantity:
                                                      previous[title]?.quantity || "",
                                                  },
                                                }))
                                              }
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              className="form-control form-control-sm"
                                              value={row.quantity}
                                              onChange={(e) =>
                                                setVariantRows((previous) => ({
                                                  ...previous,
                                                  [title]: {
                                                    ...previous[title],
                                                    costPrice:
                                                      previous[title]?.costPrice || "",
                                                    sellingPrice:
                                                      previous[title]?.sellingPrice || "",
                                                    quantity: e.target.value,
                                                  },
                                                }))
                                              }
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {variantPreviewTitles.length > 50 && (
                                <p className="text-muted fs-12 mb-0">
                                  {variantPreviewTitles.length - 50} more variants will be created.
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
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
                          <Image
                            data-feather="image"
                            className="text-primary me-2"
                          />
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="me-2" /> Save Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          {/* /add */}
        </div>
        <CommonFooter />
      </div>
      <Addunits />
      <AddBrand />
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger"></i>
                </span>
                <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Attribute</h4>
                <p className="mb-0 fs-16">
                  Are you sure you want to delete Attribute?
                </p>
                <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                  >
                    Yes Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
