"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { useCategories } from '@/hooks/useCategories'
import Link from "next/link";
import Table from "@/core/common/pagination/datatable";
import EditCategoryList from "@/core/modals/inventory/editcategorylist";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { useState, MouseEvent } from "react";
import { categoryService } from "@/services/api";

export default function CategoryListComponent() {
  const { categories, loading, error, refetch } = useCategories();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryActive, setNewCategoryActive] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [saveCategoryError, setSaveCategoryError] = useState<string | null>(null);

  const handleCreateCategory = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      setSaveCategoryError("Category name is required");
      return;
    }

    setIsSavingCategory(true);
    setSaveCategoryError(null);

    try {
      await categoryService.createCategory({
        name: newCategoryName.trim(),
        description: null,
        parentId: null,
        image: null,
        isActive: newCategoryActive,
      });

      await refetch();

      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategoryActive(true);
    } catch (err) {
      setSaveCategoryError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setIsSavingCategory(false);
    }
  };
  
  // Transform API data to match the expected format for the table
  const data = categories?.data?.map(category => ({
    id: category.id,
    category: category.name,
    categoryslug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
    createdon: new Date(category.createdAt).toLocaleDateString(),
    status: category.isActive ? "Active" : "Inactive",
  })) || [];
  const columns = [
    {
      title: "Category",
      dataIndex: "category",
      sorter: (a: any, b: any) => a.category.length - b.category.length,
    },
    {
      title: "Category Slug",
      dataIndex: "categoryslug",
      sorter: (a: any, b: any) => a.categoryslug.length - b.categoryslug.length,
    },
    {
      title: "Created On",
      dataIndex: "createdon",
      sorter: (a: any, b: any) => a.createdon.length - b.createdon.length,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: any) => (
        <span className="badge bg-success fw-medium fs-10">{text}</span>
      ),
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      key: "actions",
      render: () => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-category"
            >
              <i data-feather="edit" className="feather-edit"></i>
            </Link>
            <Link
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              className="p-2"
              href="#"
            >
              <i data-feather="trash-2" className="feather-trash-2"></i>
            </Link>
          </div>
        </div>
      ),
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
              <h5 className="text-danger">Error loading categories</h5>
              <p className="text-muted">{error}</p>
              <button className="btn btn-primary mt-2" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4 className="fw-bold">Category</h4>
                <h6>Manage your categories</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <RefreshIcon />
              <CollapesIcon />
            </ul>
            <div className="page-btn">
              <Link
                href="#"
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#add-category"
              >
                <i className="ti ti-circle-plus me-1"></i>
                Add Category
              </Link>
            </div>
          </div>
          {/* /product list */}
          <div className="card table-list-card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set"></div>
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Inactive
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
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive category-table">
                <Table columns={columns} dataSource={data} />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>

      {/* Add Category */}
      <div className="modal fade" id="add-category">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Add Category</h4>
                  </div>
                  <button
                    type="button"
                    className="close bg-danger text-white fs-16"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="mb-3">
                      <label className="form-label">
                        Category<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Category Slug<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCategorySlug}
                        onChange={(e) => setNewCategorySlug(e.target.value)}
                      />
                    </div>
                    <div className="mb-0">
                      <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                        <span className="status-label">
                          Status<span className="text-danger ms-1">*</span>
                        </span>
                        <input
                          type="checkbox"
                          id="user2"
                          className="check"
                          checked={newCategoryActive}
                          onChange={(e) => setNewCategoryActive(e.target.checked)}
                        />
                        <label htmlFor="user2" className="checktoggle" />
                      </div>
                    </div>
                    {saveCategoryError && (
                      <div className="mt-3 alert alert-danger" role="alert">
                        {saveCategoryError}
                      </div>
                    )}
                  </form>
                </div>
                <div className="modal-footer">
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
                    onClick={handleCreateCategory}
                    disabled={isSavingCategory}
                    data-bs-dismiss={isSavingCategory ? undefined : "modal"}
                  >
                    {isSavingCategory ? "Saving..." : "Add Category"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Category */}

      <EditCategoryList />
      <CommonDeleteModal />
    </div>
  );
}
