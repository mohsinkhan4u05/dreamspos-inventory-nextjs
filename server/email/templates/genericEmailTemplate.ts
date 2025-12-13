import { baseEmailLayout, escapeHtml, type EmailTemplateResult, type OrgInfo } from "./types";

export interface GenericEmailTemplateProps {
  org: OrgInfo | null;
  subject: string;
  messageHtml: string;
}

export function genericEmailTemplate(
  props: GenericEmailTemplateProps,
): EmailTemplateResult {
  const { org, subject, messageHtml } = props;

  const safeSubject = subject.trim() || "Message from your organization";

  const contentHtml = `<div style="font-size:14px;line-height:1.6;">${messageHtml}</div>`;

  const html = baseEmailLayout({
    org,
    title: safeSubject,
    contentHtml,
  });

  const text = escapeHtml(messageHtml.replace(/<[^>]+>/g, " ")).replace(
    /\s+/g,
    " ",
  );

  return { subject: safeSubject, html, text };
}
