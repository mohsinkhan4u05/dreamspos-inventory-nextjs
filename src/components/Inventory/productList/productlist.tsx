"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState, MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { Tooltip } from "antd";
import Table from "@/core/common/pagination/datatable";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { useProducts } from "@/hooks/useProducts";
import Brand from "@/core/modals/inventory/brand";
import { all_routes } from "@/data/all_routes";
import { Download, Edit, Eye, Trash2, GitMerge } from "react-feather";
import Link from "next/link";
import { productService } from "@/services/api";
import { formatCurrencyINR } from "@/lib/currency";

export default function ProductListComponent() {
  const { products, loading, error, refetch } = useProducts();
  const { data: session } = useSession();

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteProductName, setDeleteProductName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const route = all_routes;
  
  // Transform API data to match the expected format for the table
  const dataSource = products?.data?.map((product: any) => {
    const totalQuantity = Array.isArray(product.stocks)
      ? product.stocks.reduce(
          (sum: number, stock: any) =>
            sum + (typeof stock.quantity === "number" ? stock.quantity : 0),
          0,
        )
      : 0;

    const creatorName =
      product.createdBy?.username ||
      product.createdBy?.email ||
      (session?.user as any | undefined)?.name ||
      (session?.user as any | undefined)?.username ||
      "User";

    const creatorImage =
      (session?.user as any | undefined)?.image ||
      "assets/img/users/user-30.jpg";

    return {
      id: product.id,
      product: product.name,
      productImage: product.image || "assets/img/products/stock-img-01.png",
      sku: product.sku,
      category: product.category?.name || "N/A",
      brand: product.brand?.name || "N/A",
      price: formatCurrencyINR(product.sellingPrice),
      unit: "Pc", // Default unit, could be enhanced with unit data
      qty: totalQuantity.toString(),
      createdby: creatorName,
      img: creatorImage,
    };
  }) || [];

  const creatorOptions = Array.from(
    new Set((dataSource || []).map((item: any) => item.createdby).filter(Boolean))
  ) as string[];

  const handleOpenDelete = (record: any) => {
    setDeleteProductId(record.id);
    setDeleteProductName(record.product);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteProductId) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await productService.deleteProduct(deleteProductId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete Item"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "SKU",
      dataIndex: "sku",
      priority: "optional",
      sorter: (a: any, b: any) =>
        String(a.sku ?? "").length - String(b.sku ?? "").length,
    },
    {
      title: "Name",
      dataIndex: "product",
      priority: "always",
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center">
          <Link href={`/item/${record.id}`} className="avatar avatar-md me-2">
            <img alt="" src={record.productImage} />
          </Link>
          <Link href={`/item/${record.id}`}>{text}</Link>
        </div>
      ),
      sorter: (a: any, b: any) =>
        String(a.product ?? "").length - String(b.product ?? "").length,
    },
    {
      title: "Price",
      dataIndex: "price",
      priority: "always",
      sorter: (a: any, b: any) =>
        String(a.price ?? "").length - String(b.price ?? "").length,
    },
    {
      title: "Stock On Hand",
      dataIndex: "qty",
      priority: "always",
      sorter: (a: any, b: any) =>
        String(a.qty ?? "").length - String(b.qty ?? "").length,
    },

    {
      title: "Created By",
      dataIndex: "createdby",
      priority: "desktop",
      render: (text: any, record: any) => (
        <span className="userimgname">
          <Link href="/profile" className="product-img">
            <img alt="" src={record.img} />
          </Link>
          <Link href="/profile">{text}</Link>
        </span>
      ),
      sorter: (a: any, b: any) =>
        String(a.createdby ?? "").length - String(b.createdby ?? "").length,
    },
    {
      title: "Action",
      dataIndex: "action",
      priority: "optional",
      mobileHidden: true,
      render: (_: unknown, record: any) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Tooltip title="View Item">
              <Link className="me-2 p-2" href={`/item/${record.id}`}>
                <Eye className="feather-view" />
              </Link>
            </Tooltip>
            <Tooltip title="View Bill of Materials">
              <Link
                className="me-2 p-2"
                href={`${route.manufacturingBOM}?productId=${record.id}`}
              >
                <GitMerge className="feather-edit" />
              </Link>
            </Tooltip>
            <Tooltip title="Edit Item">
              <Link className="me-2 p-2" href={`${route.editproduct}/${record.id}`}>
                <Edit className="feather-edit" />
              </Link>
            </Tooltip>
            <Tooltip title="Delete Item">
              <Link
                className="confirm-text p-2"
                href="#"
                data-bs-toggle="modal"
                data-bs-target="#delete-modal"
                onClick={() => handleOpenDelete(record)}
              >
                <Trash2 className="feather-trash-2" />
              </Link>
            </Tooltip>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) =>
        String(a.createdby ?? "").length - String(b.createdby ?? "").length,
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading items</h5>
              <p className="text-muted">{error}</p>
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
                <h4>Item List</h4>
                <h6>Manage your items</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <RefreshIcon />
              <CollapesIcon />
            </ul>
            <div className="page-btn">
              <Link href={route.addproduct} className="btn btn-primary">
                <i className="ti ti-circle-plus me-1"></i>
                Add New Item
              </Link>
            </div>
            {/* <div className="page-btn import">
              <Link
                href="#"
                className="btn btn-secondary color"
                data-bs-toggle="modal"
                data-bs-target="#view-notes"
              >
                <Download className="feather me-2" />
                Import Item
              </Link>
            </div> */}
          </div>
          {/* /product list */}
          <div className="card table-list-card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set"></div>
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                {/* <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Item
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Lenovo IdeaPad 3
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Beats Pro{" "}
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Nike Jordan
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Apple Series 5 Watch
                      </Link>
                    </li>
                  </ul>
                </div> */}
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Created By
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    {creatorOptions.length === 0 && (
                      <li>
                        <span className="dropdown-item rounded-1 text-muted">
                          No creators
                        </span>
                      </li>
                    )}
                    {creatorOptions.map((name) => (
                      <li key={name}>
                        <Link href="#" className="dropdown-item rounded-1">
                          {name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Category
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Computers
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Electronics
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Shoe
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Electronics
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Brand
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Lenovo
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Beats
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Nike
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Apple
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div> */}
              </div>
            </div>
            <div className="card-body">
              {/* <div className="table-top">
              <div className="search-set">
                <div className="search-input">
                  <input
                    type="text"
                    placeholder="Search"
                    className="form-control form-control-sm formsearch"
                  />
                  <Link to className="btn btn-searchset">
                    <i data-feather="search" className="feather-search" />
                  </Link>
                </div>
              </div>
              <div className="search-path">
                <Link
                  className={`btn btn-filter ${
                    isFilterVisible ? "setclose" : ""
                  }`}
                  id="filter_search"
                >
                  <Filter
                    className="filter-icon"
                    onClick={toggleFilterVisibility}
                  />
                  <span onClick={toggleFilterVisibility}>
                    <img
                      src="assets/img/icons/closes.svg"
                      alt="img"
                    />
                  </span>
                </Link>
              </div>
              <div className="form-sort">
                <Sliders className="info-img" />
                <Select
                  className="img-select"
                  classNamePrefix="react-select"
                  options={options}
                  placeholder="14 09 23"
                />
              </div>
            </div> */}
              {/* /Filter */}
              {/* <div
              className={`card${isFilterVisible ? " visible" : ""}`}
              id="filter_inputs"
              style={{ display: isFilterVisible ? "block" : "none" }}
            >
              <div className="card-body pb-0">
                <div className="row">
                  <div className="col-lg-12 col-sm-12">
                    <div className="row">
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <Box className="info-img" />
                          <Select
                            className="img-select"
                            classNamePrefix="react-select"
                            options={productlist}
                            placeholder="Choose Product"
                          />
                        </div>
                      </div>
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <StopCircle className="info-img" />
                          <Select
                            className="img-select"
                            classNamePrefix="react-select"
                            options={categorylist}
                            placeholder="Choose Category"
                          />
                        </div>
                      </div>
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <GitMerge className="info-img" />
                          <Select
                            className="img-select"
                            classNamePrefix="react-select"
                            options={subcategorylist}
                            placeholder="Choose Sub Category"
                          />
                        </div>
                      </div>
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <StopCircle className="info-img" />
                          <Select
                            className="img-select"
                            classNamePrefix="react-select"
                            options={brandlist}
                            placeholder="Nike"
                          />
                        </div>
                      </div>
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <i className="fas fa-money-bill info-img" />

                          <Select
                            className="img-select"
                            classNamePrefix="react-select"
                            options={price}
                            placeholder="Price"
                          />
                        </div>
                      </div>
                      <div className="col-lg-2 col-sm-6 col-12">
                        <div className="input-blocks">
                          <Link className="btn btn-filters ms-auto">
                            {" "}
                            <i
                              data-feather="search"
                              className="feather-search"
                            />{" "}
                            Search{" "}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
              {/* /Filter */}
              <div className="table-responsive">
                <Table columns={columns} dataSource={dataSource} />
              </div>
            </div>
          </div>
          {/* /product list */}
          <Brand />
        </div>
      </div>
      <>
        {/* delete modal */}
        <div className="modal fade" id="delete-modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger" />
                  </span>
                  <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">
                    Delete Item
                  </h4>
                  <p className="text-gray-6 mb-0 fs-16">
                    Are you sure you want to delete {deleteProductName || "this Item"}?
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
                      data-bs-dismiss="modal"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Yes Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    </>
  );
}
