"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { all_routes } from "@/data/all_routes";
import { usePaymentDetail } from "@/hooks/usePaymentDetail";
import { emailService } from "@/services/api";

interface AttachmentState {
  file: File;
  base64: string;
}

function PaymentSendEmailForm({ id }: { id: string }) {
  const router = useRouter();
  const route = all_routes;
  const { payment, loading, error } = usePaymentDetail(id);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) return;

    if (!to) {
      const customerEmail = payment.sale?.customer?.email || "";
      if (customerEmail) setTo(customerEmail);
    }

    if (!subject) {
      setSubject(`Payment Receipt #${payment.id.slice(0, 8)}`);
    }
  }, [payment, to, subject]);

  if (!id) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Payment id is required.</p>
          <Link
            href={route.paymentdetails || "/payment-details"}
            className="btn btn-outline-secondary mt-2"
          >
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !payment) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>
            {loading ? "Loading payment..." : error || "Payment not found"}
          </p>
        </div>
      </div>
    );
  }

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
              resolve({ file, base64: data.split(",")[1] ?? "" });
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

  const sendEmailInternal = async (includePdf: boolean) => {
    if (!payment) return;

    setSending(true);
    setSendError(null);

    try {
      const payload: Record<string, any> = {
        type: "PAYMENT_RECEIPT",
        entityId: payment.id,
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

      router.push(`${route.paymentdetails}?id=${payment.id}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("rate limit")) {
        setSendError(
          "Too many emails were sent in a short time. Please wait a minute and try again.",
        );
      } else {
        setSendError(
          err instanceof Error ? err.message : "Failed to send payment receipt",
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

  const customerName = payment.sale?.customer?.name || "Walk-in Customer";

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Send Payment Receipt</h4>
            <h6>
              Receipt #{payment.id.slice(0, 8)} — {customerName}
            </h6>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-4">
          {sendError && (
            <div className="alert alert-danger">{sendError}</div>
          )}

          <div className="mb-3">
            <label className="form-label">To</label>
            <input
              type="text"
              className="form-control"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">CC</label>
            <input
              type="text"
              className="form-control"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">BCC</label>
            <input
              type="text"
              className="form-control"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-control"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

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

          <div className="text-end mt-3">
            <Link
              href={`${route.paymentdetails}?id=${payment.id}`}
              className="btn btn-secondary me-2"
            >
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

export default function PaymentSendEmailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  return <PaymentSendEmailForm id={id} />;
}
