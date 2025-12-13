export interface OrgInfo {
  name: string;
  companyId?: string | null;
  logoUrl?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  location?: string | null;
}

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildOrgAddress(org: OrgInfo | null): string {
  if (!org) return "";
  const parts = [
    org.addressLine1,
    org.addressLine2,
    org.city,
    org.state,
    org.zipCode,
    org.location,
  ]
    .filter((p) => typeof p === "string" && p.trim().length > 0)
    .map((p) => p!.trim());

  return parts.join(", ");
}

export function baseEmailLayout(params: {
  org: OrgInfo | null;
  title: string;
  contentHtml: string;
  customMessageHtml?: string;
}): string {
  const { org, title, contentHtml, customMessageHtml } = params;

  const address = buildOrgAddress(org);

  const logoHtml = org?.logoUrl
    ? `<img src="${escapeHtml(org.logoUrl)}" alt="${escapeHtml(
        org.name,
      )}" style="max-height:48px; display:block;" />`
    : "";

  const headerTitle = escapeHtml(org?.name || "");

  const contactLineParts: string[] = [];
  if (org?.primaryContactEmail) {
    contactLineParts.push(escapeHtml(org.primaryContactEmail));
  }
  if (org?.primaryContactPhone) {
    contactLineParts.push(escapeHtml(org.primaryContactPhone));
  }
  const contactLine = contactLineParts.join(" · ");

  const legalFooter =
    "This email and any attachments may contain confidential information. If you are not the intended recipient, please notify the sender immediately and delete this email.";

  return `
  <div style="background-color:#f5f5f5;padding:24px 0;">
    <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:6px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#333;">
      <div style="padding:16px 24px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;gap:12px;">
        ${logoHtml}
        <div>
          <div style="font-size:18px;font-weight:600;">${headerTitle}</div>
          ${address ? `<div style="font-size:12px;color:#666;">${escapeHtml(
            address,
          )}</div>` : ""}
          ${contactLine ? `<div style="font-size:12px;color:#666;">${contactLine}</div>` : ""}
        </div>
      </div>
      <div style="padding:20px 24px 8px 24px;border-bottom:1px solid #f0f0f0;">
        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#111;">${escapeHtml(
          title,
        )}</h1>
      </div>
      <div style="padding:16px 24px 24px 24px;">
        ${customMessageHtml ? `<div style="margin-bottom:12px;">${customMessageHtml}</div>` : ""}
        ${contentHtml}
      </div>
      <div style="padding:12px 24px 16px 24px;border-top:1px solid #f0f0f0;font-size:11px;color:#888;">
        <div style="margin-bottom:4px;">Best regards,<br/>${headerTitle ||
          "Your Organization"}</div>
        <div style="margin-top:8px;line-height:1.4;">${escapeHtml(
          legalFooter,
        )}</div>
      </div>
    </div>
  </div>
  `;
}
