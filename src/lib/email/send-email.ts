/**
 * Email sending utility
 * Uses SMTP configuration from environment variables.
 */

import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Lazily create a transporter so this file can be imported in edge/serverless
// environments without immediately touching Node-specific APIs.
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const fromAddress =
    options.from ||
    (process.env.SMTP_FROM_NAME && process.env.SMTP_FROM_EMAIL
      ? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`
      : process.env.EMAIL_FROM || "noreply@dreamspos.com");

  // Always log in development so you can see the email content easily
  if (process.env.NODE_ENV === "development") {
    console.log("=== EMAIL DEBUG ===");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("From:", fromAddress);
    console.log("==================");
  }

  try {
    const transporter = createTransport();

    await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error("Error sending email via SMTP:", error);
    throw error;
  }
}
