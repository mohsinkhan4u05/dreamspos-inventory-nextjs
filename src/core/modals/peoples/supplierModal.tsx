"use client";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, FormEvent, MouseEvent } from "react";
import Select from "react-select";
import { supplierService } from "@/services/api";

interface EditingSupplier {
  id: string;
  supplierName: string;
  email: string;
  phone: string;
}

interface DeletingSupplier {
  id: string;
  supplierName: string;
}

interface SupplierModalProps {
  editingSupplier: EditingSupplier | null;
  deletingSupplier: DeletingSupplier | null;
  onRefetch: () => void | Promise<void>;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  editingSupplier,
  deletingSupplier,
  onRefetch,
}) => {
  const city = [
    { value: "Choose", label: "Choose" },
    { value: "Varrel", label: "Varrel" },
    { value: "Los Angels", label: "Los Angels" },
    { value: "Munich", label: "Munich" },
  ];
  const state = [
    { value: "Choose", label: "Choose" },
    { value: "Bavaria", label: "Bavaria" },
    { value: "New York City", label: "New York City" },
    { value: "California", label: "California" },
  ];

  const country = [
    { value: "Choose", label: "Choose" },
    { value: "Germany", label: "Germany" },
    { value: "Mexico", label: "Mexico" },
  ];

  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSupplier) {
      const parts = editingSupplier.supplierName.split(" ");
      setEditFirstName(parts[0] || "");
      setEditLastName(parts.slice(1).join(" ") || "");
      setEditEmail(editingSupplier.email || "");
      setEditPhone(editingSupplier.phone || "");
      setEditAddress("");
      setEditActive(true);
      setEditError(null);
    }
  }, [editingSupplier]);

  const handleAddSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!addFirstName.trim() || !addEmail.trim() || !addPhone.trim()) {
      setAddError("First name, email, and phone are required");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const name = `${addFirstName} ${addLastName}`.trim();

      await supplierService.createSupplier({
        name,
        email: addEmail.trim(),
        phone: addPhone.trim(),
        address: addAddress.trim() || null,
        isActive: addActive,
      });

      await onRefetch();

      setAddFirstName("");
      setAddLastName("");
      setAddEmail("");
      setAddPhone("");
      setAddAddress("");
      setAddActive(true);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add supplier"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingSupplier) return;

    if (!editFirstName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setEditError("First name, email, and phone are required");
      return;
    }

    setIsEditing(true);
    setEditError(null);

    try {
      const name = `${editFirstName} ${editLastName}`.trim();

      await supplierService.updateSupplier(editingSupplier.id, {
        name,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim() || null,
        isActive: editActive,
      });

      await onRefetch();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update supplier"
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deletingSupplier) return;

    setDeleteError(null);

    try {
      await supplierService.deleteSupplier(deletingSupplier.id);
      await onRefetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete supplier"
      );
    }
  };

  return (
    <div>
      <>
        {/* Add Supplier */}
        <div className="modal fade" id="add-supplier">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Add Supplier</h4>
                </div>
                <button
                  type="button"
                  className="close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="new-employee-field">
                        <div className="profile-pic-upload mb-2">
                          <div className="profile-pic">
                            <span>
                              <i
                                data-feather="plus-circle"
                                className="plus-down-add"
                              />
                              Add Image
                            </span>
                          </div>
                          <div className="mb-0">
                            <div className="image-upload mb-2">
                              <input type="file" />
                              <div className="image-uploads">
                                <h4>Upload Image</h4>
                              </div>
                            </div>
                            <p>JPEG, PNG up to 2 MB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={addFirstName}
                          onChange={(e) => setAddFirstName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={addLastName}
                          onChange={(e) => setAddLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={addPhone}
                          onChange={(e) => setAddPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Address <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={addAddress}
                          onChange={(e) => setAddAddress(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6 col-sm-10 col-10">
                      <div className="mb-3">
                        <label className="form-label">
                          City <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={city}
                          placeholder="Choose"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6 col-sm-10 col-10">
                      <div className="mb-3">
                        <label className="form-label">
                          State <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={state}
                          placeholder="Choose"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6 col-sm-10 col-10">
                      <div className="mb-3">
                        <label className="form-label">
                          Country <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={country}
                          placeholder="Choose"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Postal Code <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-0">
                        <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                          <span className="status-label">Status</span>
                          <input
                            type="checkbox"
                            id="users5"
                            className="check"
                            checked={addActive}
                            onChange={(e) => setAddActive(e.target.checked)}
                          />
                          <label htmlFor="users5" className="checktoggle mb-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {addError && (
                    <div className="mt-3 alert alert-danger" role="alert">
                      {addError}
                    </div>
                  )}
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
                    type="submit"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                    disabled={isAdding}
                    data-bs-dismiss={isAdding ? undefined : "modal"}
                  >
                    {isAdding ? "Saving..." : "Add Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Supplier */}
        {/* Edit Supplier */}
        <div className="modal fade" id="edit-supplier">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Edit Supplier</h4>
                  </div>
                  <button
                    type="button"
                    className="close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-lg-12">
                        <div className="new-employee-field">
                          <div className="profile-pic-upload edit-pic">
                            <div className="profile-pic">
                              <span>
                                <img
                                  src="assets/img/supplier/edit-supplier.jpg"
                                  alt="Img"
                                />
                              </span>
                              <div className="close-img">
                                <i data-feather="x" className="info-img" />
                              </div>
                            </div>
                            <div className="mb-0">
                              <div className="image-upload mb-0">
                                <input type="file" />
                                <div className="image-uploads">
                                  <h4>Change Image</h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="mb-3">
                          <label className="form-label">
                            First Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Last Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger">*</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Phone <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Address <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-6 col-sm-10 col-10">
                        <div className="mb-3">
                          <label className="form-label">
                            City <span className="text-danger">*</span>
                          </label>
                          <Select
                          classNamePrefix="react-select"
                          options={city}
                          placeholder="Choose"
                        />
                        </div>
                      </div>
                      <div className="col-lg-6 col-sm-10 col-10">
                        <div className="mb-3">
                          <label className="form-label">
                            State <span className="text-danger">*</span>
                          </label>
                          <Select
                          classNamePrefix="react-select"
                          options={state}
                          placeholder="Choose"
                        />
                        </div>
                      </div>
                      <div className="col-lg-6 col-sm-10 col-10">
                        <div className="mb-3">
                          <label className="form-label">
                            Country <span className="text-danger">*</span>
                          </label>
                          <Select
                          classNamePrefix="react-select"
                          options={country}
                          placeholder="Choose"
                        />
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Postal Code <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            defaultValue={10176}
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-0">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">Status</span>
                            <input
                              type="checkbox"
                              id="users6"
                              className="check"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                            />
                            <label htmlFor="users6" className="checktoggle mb-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {editError && (
                      <div className="mt-3 alert alert-danger" role="alert">
                        {editError}
                      </div>
                    )}
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
                      type="submit"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      disabled={isEditing}
                      data-bs-dismiss={isEditing ? undefined : "modal"}
                    >
                      {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        {/* /Edit Supplier */}
        {/* Delete Modal */}
        <div className="modal fade" id="delete-modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-5">
              <div className="modal-body text-center p-0">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">
                  Delete Supplier
                </h4>
                <p className="text-gray-6 mb-0 fs-16">
                  Are you sure you want to delete {deletingSupplier?.supplierName || "this supplier"}?
                </p>
                {deleteError && (
                  <div className="mt-3 alert alert-danger" role="alert">
                    {deleteError}
                  </div>
                )}
                <div className="d-flex justify-content-center mt-3">
                  <Link
                  href="#"
                    className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                    onClick={handleDeleteClick}
                    data-bs-dismiss="modal"
                  >
                    Yes Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Delete Modal */}
      </>

    </div>
  );
};

export default SupplierModal;
