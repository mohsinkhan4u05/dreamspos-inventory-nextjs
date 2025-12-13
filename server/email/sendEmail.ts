import nodemailer, { type Transporter } from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  fromName?: string;
  fromEmail?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

let transporter: Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "";
  const portValue = process.env.SMTP_PORT || "";
  const port = portValue ? Number(portValue) : 587;
  const user = process.env.SMTP_USERNAME || "";
  const pass = process.env.SMTP_PASSWORD || "";

  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || "DreamsPOS";

  if (!host || !user || !pass || !fromEmail) {
    throw new Error(
      "SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM_EMAIL.",
    );
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { host, port, user, pass } = getSmtpConfig();

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { fromEmail: defaultFromEmail, fromName: defaultFromName } =
      getSmtpConfig();
    const transport = getTransporter();

    const fromEmail = payload.fromEmail || defaultFromEmail;
    const fromName = payload.fromName || defaultFromName;

    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const mailAttachments = (payload.attachments || []).map((att) => ({
      filename: att.filename,
      content: att.content,
      path: att.path,
      contentType: att.contentType,
    }));

    const mailOptions = {
      from,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
    };

    const maxRetries = 2;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        const info = await transport.sendMail(mailOptions);
        console.log("Email sent", {
          messageId: info.messageId,
          to: payload.to,
          subject: payload.subject,
        });
        return { success: true };
      } catch (err) {
        attempt += 1;
        lastError = err;
        console.error("Failed to send email", { attempt, error: err });
        if (attempt > maxRetries) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    const message =
      lastError instanceof Error
        ? lastError.message
        : "Failed to send email";

    return { success: false, error: message };
  } catch (error) {
    console.error("Email send configuration error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send email due to configuration error";
    return { success: false, error: message };
  }
}
