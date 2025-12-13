"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { all_routes } from "@/data/all_routes";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { emailService } from "@/services/api";

interface AttachmentState {
  file: File;
  base64: string;
}

interface PurchaseOrderSendEmailFormProps {
  id: string;
}

export default function PurchaseOrderSendEmailPage(props: any) {
  const { id } = (props.params ?? {}) as { id: string };
  return <PurchaseOrderSendEmailForm id={id} />;
}
/* -------------------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------------------- */
function PurchaseOrderSendEmailForm({ id }: PurchaseOrderSendEmailFormProps) {
  const router = useRouter();
  const route = all_routes;

  const { order, loading, error } = usePurchaseOrder(id);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  /* -------------------------------------------------------------
     INIT DEFAULT “TO” + SUBJECT USING ORDER DETAILS
  -------------------------------------------------------------- */
  useEffect(() => {
    if (!order) return;

    if (!to) {
      const orderTo = order.emailRecipients || "";
      const supplierTo = order.supplier?.email || "";
      const initialTo = orderTo || supplierTo;
      if (initialTo) setTo(initialTo);
    }

    if (!subject) {
      setSubject(`Purchase Order #${order.orderNumber}`);
    }
  }, [order, to, subject]);

  /* -------------------------------------------------------------
     EARLY VALIDATION
  -------------------------------------------------------------- */
  if (!id) {
    return (
      <Wrapper>
        <p>Purchase order id is required.</p>
        <BackButton href={route.purchaseorderreport} />
      </Wrapper>
    );
  }

  if (loading || !order) {
    return (
      <Wrapper>
        <p>{loading ? "Loading purchase order..." : error || "Order not found"}</p>
      </Wrapper>
    );
  }

  const supplierName = order.supplier?.name || "-";

  /* -------------------------------------------------------------
     FILE ATTACHMENT HANDLER
  -------------------------------------------------------------- */
  const handleFilesChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const files = event.target.files;
    if (!files || !files.length) {
      setAttachments([]);
      return;
    }

    const fileArray = Array.from(files);

    const results: AttachmentState[] = await Promise.all(
      fileArray.map((file) => {
        return new Promise<AttachmentState>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const data = reader.result;
            if (typeof data === "string") {
              resolve({
                file,
                base64: data.split(",")[1] ?? "",
              });
            } else {
              reject(new Error("Failed to read base64"));
            }
          };
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsDataURL(file);
        });
      }),
    );

    setAttachments(results);
  };

  /* -------------------------------------------------------------
     SUBMIT HANDLER
  -------------------------------------------------------------- */
  const sendEmailInternal = async (includePdf: boolean) => {
    if (!order) return;

    setSending(true);
    setSendError(null);

    try {
      const payload: Record<string, any> = {
        type: "PURCHASE_ORDER",
        entityId: order.id,
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        includePdf,
        attachments:
          attachments.length > 0
            ? attachments.map((a) => ({
                filename: a.file.name,
                content: a.base64,
                contentType: a.file.type || "application/octet-stream",
                size: a.file.size,
              }))
            : undefined,
      };

      await emailService.sendEmail(payload);

      router.push(route.purchaseorderreport);
    } catch (err) {
      if (err instanceof Error && err.message.includes("rate limit")) {
        setSendError(
          "Too many emails were sent in a short time. Please wait a minute and try again.",
        );
      } else {
        setSendError(
          err instanceof Error
            ? err.message
            : "Failed to send purchase order email",
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await sendEmailInternal(false);
  };

  /* -------------------------------------------------------------
     RENDER
  -------------------------------------------------------------- */
  return (
    <div className="page-wrapper">
      <div className="content">

        <div className="page-header">
          <div className="page-title">
            <h4>Send Purchase Order</h4>
            <h6>
              #{order.orderNumber} — {supplierName}
            </h6>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-4">

          {/* Error State */}
          {sendError && (
            <div className="alert alert-danger">{sendError}</div>
          )}

          {/* TO */}
          <FormInput
            label="To"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />

          {/* CC */}
          <FormInput
            label="CC"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com"
          />

          {/* BCC */}
          <FormInput
            label="BCC"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="bcc@example.com"
          />

          {/* SUBJECT */}
          <FormInput
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          {/* MESSAGE */}
          <div className="mb-3">
            <label className="form-label">Message</label>
            <textarea
              className="form-control"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
            />
          </div>

          {/* ATTACHMENTS */}
          <div className="mb-3">
            <label className="form-label">Attachments</label>
            <input
              type="file"
              multiple
              className="form-control"
              onChange={handleFilesChange}
            />
            {attachments.length > 0 && (
              <small className="text-muted">
                {attachments.length} file(s) selected
              </small>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="text-end mt-3">
            <Link href={route.purchaseorderreport} className="btn btn-secondary me-2">
              Cancel
            </Link>
            <button className="btn btn-primary me-2" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Email"}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={sending}
              onClick={() => sendEmailInternal(true)}
            >
              {sending ? "Sending..." : "Send with PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   REUSABLE COMPONENTS
-------------------------------------------------------------- */

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <div className="content">{children}</div>
    </div>
  );
}

function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="btn btn-outline-secondary mt-2">
      Back to Purchase Orders
    </Link>
  );
}

function FormInput(props: {
  label: string;
  required?: boolean;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="form-label">
        {props.label} {props.required && <span className="text-danger">*</span>}
      </label>
      <input
        className="form-control"
        type="text"
        value={props.value}
        required={props.required}
        onChange={props.onChange}
        placeholder={props.placeholder}
      />
    </div>
  );
}
